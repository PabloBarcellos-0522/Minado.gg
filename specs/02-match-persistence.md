# SPEC 02 — Persistência de partidas, Stats/XP e ranking por período

## 1. Visão geral

Hoje o schema Prisma (`Match`, `MatchPlayer`, `Stats`, `Achievement`, `UserAchievement`) existe, mas **nada é gravado**: as partidas vivem só na memória do `GameManager` e somem no fim. `User.xp`/`User.level` nunca mudam, `Stats` é criado no registro mas nunca atualizado, e `MatchPlayer.actions` fica sempre `null`. O endpoint `GET /api/users/ranking` portanto retorna dados inúteis (todos com `xp = 0`).

Esta spec adiciona:

1. **Registro de ações por jogador** no `GameManager` (reveals/flags com coordenadas e timestamp, capped em 500/jogador) e flag `exploded` por jogador.
2. **Módulo de persistência** (`apps/server/src/db/gamePersistence.ts`) que, no fim de cada partida real, grava em uma `$transaction`:
   - 1 linha `Match` (`status = 'finished'`, `endedAt`),
   - 1 linha `MatchPlayer` por jogador (score final, rank, `exploded`, `actions`),
   - update de `Stats` (victories/defeats/matchesPlayed/currentStreak/maxStreak/rank),
   - award de `xp` + recálculo de `level` no `User`.
3. **`?period=global|weekly|monthly`** no ranking, com agregação de `MatchPlayer.score` por período.
4. **Idempotência**: guarda em memória + coluna `Match.roomId` para dedupe no banco.

Persistência é **fire-and-forget** (não bloqueia o fluxo de sockets) e determinística (fórmulas fechadas, sem aleatoriedade).

## 2. Estado atual

Fatos verificados (linhas conferidas nesta leitura):

- `apps/server/prisma/schema.prisma`
  - `User` (L10–24): `xp Int @default(0)` (L16), `level Int @default(1)` (L17).
  - `Stats` (L39–50): `victories`, `defeats`, `matchesPlayed`, `currentStreak`, `maxStreak`, `rank Int @default(0)` (L47). Criado apenas no registro (`auth.ts:29`, `oauth.ts:47`); **nunca atualizado**.
  - `Match` (L52–63): `mode String`, **`boardRows/boardCols/mineCount Int`** (L55–57 — NÃO existe `boardConfig`), `status String @default("playing")` (L58), `startedAt DateTime @default(now())` (L59 — NÃO existe `createdAt`), `endedAt DateTime?` (L60). **Não tem `roomId`**.
  - `MatchPlayer` (L65–78): `score`, `exploded Boolean @default(false)`, `rank Int?` (L71), `actions Json?` (L72, sempre `null`), `@@unique([matchId, userId])` (L77).
- `prisma.` é usado somente em `routes/auth.ts`, `routes/oauth.ts`, `routes/users.ts`. Não existe `prisma.match.*` nem `prisma.stats.update` em lugar nenhum (grep confirmado).
- `apps/server/src/game/GameManager.ts` (426 linhas):
  - `endGame` L191–204; `endByTimer` L206–225 — **já flui por `onGameEnded`** (L223, reason `'timeout'`), nada a corrigir.
  - Callbacks declarados: `onGameEnded` L82, `onPlayerEliminated` L83, `onPlayerBoardComplete` L84. Apenas `onGameEnded` e `onPlayerRemoved` são ligados em `index.ts`.
  - `getScoreboard` L410–417 adiciona `rank` via `as any` (L416).
  - `GameEndReason` L45: `'win' | 'timeout' | 'complete' | 'eliminated' | 'last_standing'`. `endGame` nunca é chamado com `'eliminated'`.
  - Ações **não** são registradas hoje (nem `revealCell` L227–348 nem `flagCell` L350–400 gravam histórico).
- `apps/server/src/index.ts` L31–46: `onGameEnded` emite `game:ended` com reason + scoreboard, seta `room.status = 'finished'` (L43) e re-emite `room:state`. L32: `if (reason === 'eliminated') return` (defensivo — nunca dispara).
- `apps/server/src/sockets/gameHandler.ts` L58–73: eliminação individual no battle-royale emite `game:ended` com reason `'eliminated'` **diretamente para o socket**, sem passar por `onGameEnded`. Ou seja: **esse caminho nunca aciona persistência** — que é exatamente o desejado (não é fim da partida).
- `apps/server/src/sockets/roomHandler.ts` L7: `getUserId = (sock) => (sock as any).userId || sock.id`. Como o middleware de auth (`index.ts` L68–82) bloqueia conexões sem JWT, `player.id` do `Room.players` **é** o `User.id` do banco. Não existe campo `userId` separado no `Player`.
- `apps/server/src/routes/users.ts` L6–20: `GET /api/users/ranking` → top 100 por `xp desc`, shape `{rank, id, username, avatarUrl, xp, level, stats:{victories, matchesPlayed}}`.
- `apps/web/src/store/gameStore.ts` L231–270: handler de `game:ended` deriva win/lose no cliente; `lastMatchResult` é só memória (L267 `actions: []`).
- `packages/shared/src/index.ts`: `calculateScore` L59–69 (reveal 10, flood-fill 30, flag-correct 25, flag-wrong −15, explode −50, **win 200**). `packages/shared/package.json` L6–10: `main`/`types` apontam direto para `./src/index.ts` — **editar shared não exige build**, basta reiniciar o server (`tsx watch` já recarrega).

### Como detectar o "fim real" da partida

**Regra:** só persiste quando `gameManager.onGameEnded` dispara (reasons `'win' | 'complete' | 'last_standing' | 'timeout'`). O evento pessoal `game:ended { result: 'eliminated' }` de `gameHandler.ts:65-72` **não** passa por `onGameEnded` e **não** persiste. O guard `if (reason === 'eliminated') return` de `index.ts:32` permanece como defesa extra. Além disso, **partida sem nenhum jogador no scoreboard não é persistida** (todos saíram a meio — guard no passo 5).

## 3. Requisitos e regras

### R1 — Criação de `Match` + `MatchPlayer`

No fim real da partida (critério acima), gravar exatamente:

- `Match`: `mode` (do room), `boardRows/boardCols/mineCount` (de `room.boardConfig`), `status = 'finished'`, `startedAt` = `game.startedAt` (ms → `Date`), `endedAt` = `game.endedAt` (ms → `Date`), `roomId` (nova coluna, passo 4).
- `MatchPlayer` por jogador presente no scoreboard final: `score` final, `rank` (1 = maior score; rank derivado do scoreboard ordenado — índice `i + 1`), `exploded` (novo `Set` no `GameState`), `actions` (array JSON de `PlayerAction` do jogador).

### R2 — Vitória/derrota (definição exata)

- **Competitive / Multi-board / Battle-royale / Fog-of-war**: vencedor = **único jogador com `rank === 1`** do scoreboard final (ranks são únicos por construção — `i + 1` no sort estável por score desc; empates no score desempata pela ordem de inserção no `Map`, não por tempo — documentado, determinístico). Todos os demais jogadores do scoreboard: derrota.
- **Cooperative (vitória em equipe)**: se `reason === 'win'`, **todos** os jogadores do scoreboard final vencem; senão (`timeout` etc.) todos perdem. Scoreboard do coop tem todos os players ativos no fim.
- `Stats.defeats` recebe +1 para quem não venceu; `victories` +1 para quem venceu; `matchesPlayed` +1 para todos.

### R3 — Streaks

- Vitória: `currentStreak = currentStreak + 1`; `maxStreak = max(maxStreak, currentStreak)`.
- Derrota: `currentStreak = 0`. `maxStreak` inalterado.

### R4 — `Stats.rank` (melhor rank de todos os tempos)

`rank` menor = melhor (1 = campeão). Regra: `novoRank = atual === 0 ? rankDaPartida : min(atual, rankDaPartida)`. O `0` é o valor default de "nunca definido" do schema (L47).

### R5 — XP e level (determinístico, constantes no shared)

Novas constantes em `packages/shared/src/index.ts` (ver passo 1):

```
xpDaPartida = XP_BASE_BY_MODE[mode]          // base por modo
            + (isVictory ? XP_WIN_BONUS : 0) // 200, == calculateScore('win')
            + Math.floor(score / XP_PER_SCORE_UNIT) // 1 xp a cada 10 pontos
```

- `XP_BASE_BY_MODE`: `competitive 100`, `multi-board 100`, `cooperative 150`, `battle-royale 150`, `fog-of-war 120`.
- `XP_WIN_BONUS = 200` (igual ao `calculateScore('win')` já existente — coerência).
- `XP_PER_SCORE_UNIT = 10`.
- `xp` é acumulada no `User`: `novoXp = user.xp + xpDaPartida`; `level = levelForXp(novoXp)`.
- **Fórmula do level**: `levelForXp(xp) = Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1`. Tabela: 0–99 → 1; 100–399 → 2; 400–899 → 3; 900–1599 → 4; 1600–2499 → 5. Monótona, nunca regride.

### R6 — Ranking por período

`GET /api/users/ranking?period=global|weekly|monthly`

- `global` (default): comportamento atual (top 100 `xp desc`).
- `weekly`: soma de `MatchPlayer.score` das partidas com `Match.startedAt >= now - 7 dias`.
- `monthly`: idem com 30 dias.
- Ordenação: `periodScore desc`, desempate por `xp desc`, depois `victories desc`. Top 100.
- Shape da resposta: `{rank, id, username, avatarUrl, xp, level, stats:{victories, matchesPlayed}, periodScore?}` — `periodScore` presente apenas em weekly/monthly (aditivo, não quebra o cliente).

### R7 — Não bloqueio e idempotência

- Persistência **fire-and-forget**: `persistMatch(...).catch(err => console.error('[persistMatch]', err))` — nunca `await` no handler de socket.
- **Guard primário**: `GameState.endedAt` (já existente, L194/L212) garante `onGameEnded` 1x por estado em memória.
- **Guard secundário**: `Set` em memória no módulo de persistência, chaveado por `roomId:startedAt`, pula gravações duplicadas.
- **Guard no banco**: coluna `Match.roomId` (novo) — antes do insert, `findFirst({ where: { roomId, startedAt } })`; se existir, aborta. (Também habilita analytics e "rematch".)
- `MatchPlayer.@@unique([matchId, userId])` (L77) impede duplicidade de jogador dentro da mesma partida.

## 4. Passos de implementação

Ordem executável do 1 ao 8. Cada passo valida isoladamente.

### Passo 1 — Constantes de XP/level no shared

- **Arquivos**: `packages/shared/src/index.ts`
- **O que fazer**: adicionar, ao final do arquivo, as constantes exportadas.
- **Detalhes**:

```ts
// XP / level (SPEC 02)
export const XP_BASE_BY_MODE: Record<GameMode, number> = {
  competitive: 100,
  'multi-board': 100,
  cooperative: 150,
  'battle-royale': 150,
  'fog-of-war': 120,
}
export const XP_WIN_BONUS = 200
export const XP_PER_SCORE_UNIT = 10

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1
}
```

- **Por quê**: um único lugar define a economia de XP; `levelForXp` é pura (testável) e consistente entre client (display) e server (aplicação). `XP_WIN_BONUS === calculateScore('win')` mantém coerência com o scoring existente (L66).
- **Como validar**: `cd apps/server && npm run typecheck` (o shared é consumido como fonte via `main: ./src/index.ts` — o `tsc` do server compila o arquivo importado). Reiniciar o `tsx watch` para recarregar.

### Passo 2 — Registro de ações + exploded no GameManager

- **Arquivos**: `apps/server/src/game/GameManager.ts`
- **O que fazer**:
  1. Exportar `PlayerAction` e constante `MAX_ACTIONS_PER_PLAYER = 500`.
  2. Adicionar ao `GameState` (L30–43): `actions: Map<string, PlayerAction[]>` e `explodedPlayers: Set<string>`.
  3. Inicializar ambos em `startGame` (junto aos `scores`/`playerStatus`, L87–92).
  4. Helper `recordAction(state, playerId, action)` privado: faz push e, se `length > 500`, `shift()` (mantém as **últimas** 500). Se o jogador não existir no Map, cria.
  5. Chamar em `revealCell`: no caminho da mina (L250–259) com `{type:'explode', row, col, ts}` **e** adicionar `playerId` ao `explodedPlayers`; no flood-fill (L300–307) com `{type:'flood-fill', row, col, ts}` (uma entrada, com a célula clicada); no reveal único (L308–312) com `{type:'reveal', row, col, ts}`.
  6. Chamar em `flagCell` (L372, após o toggle) com `{type:'flag', row, col, ts}` (registra tanto flag como unflag — é histórico, não pontuação).
  7. Todas as chamadas ficam **após** os guards de `endedAt`/status (L232/L355), então nada é gravado depois do fim.
- **Detalhes**: `PlayerAction = { type: 'reveal' | 'flood-fill' | 'flag' | 'explode'; row: number; col: number; ts: number }` (ts = epoch ms). `explodedPlayers` resolve o `MatchPlayer.exploded` sem depender de parsing das actions.
- **Por quê**: `MatchPlayer.actions` (schema L72) exige histórico; hoje não existe. Sem `explodedPlayers`, o flag `exploded` não teria fonte confiável (fora do battle-royale, mina ≠ eliminação).
- **Como validar**: `npm run typecheck`; após o passo 3, jogar uma partida e conferir `actions` preenchidas no Prisma Studio.

### Passo 3 — `onGameEnded` passa o `GameState` completo

- **Arquivos**: `apps/server/src/game/GameManager.ts`, `apps/server/src/index.ts`
- **O que fazer**:
  1. Alterar a assinatura (L82) para: `onGameEnded?: (roomId: string, scoreboard: GameScoreEntry[], reason: GameEndReason, game: GameState) => void`.
  2. Em `endGame` (L203) e `endByTimer` (L223), passar `state` como 4º argumento. O `state` é o objeto vivo — `actions`, `explodedPlayers`, `startedAt`, `endedAt`, `config`, `mode` estão acessíveis.
  3. Em `index.ts` L31, atualizar o callback para aceitar o 4º parâmetro `game` (manter os emits atuais intactos).
- **Detalhes**: o `removeGame` de `gameHandler.ts` (L79/L106/L137) roda **depois** do `onGameEnded` (que é síncrono dentro de `endGame`), então o estado sempre existe dentro do callback. Passar `game` por assinatura é mais robusto do que reler o map. O `as any` de `getScoreboard` (L416) fica como está (o rank é derivado novamente em `index.ts` com `i + 1`); limpeza de tipos é opcional.
- **Por quê**: o persistence layer precisa de `mode`, `config`, timestamps, `actions` e `explodedPlayers` — tudo no `GameState`, sem consulta extra e sem dependência do momento em que o jogo é removido do map.
- **Como validar**: `npm run typecheck`; dois clientes jogando — `game:ended` continua funcionando como antes (regressão zero).

### Passo 4 — Schema: `roomId` no Match + índices

- **Arquivos**: `apps/server/prisma/schema.prisma`
- **O que fazer**: no `model Match` (L52–63), adicionar:

```prisma
  roomId    String?  @index
  @@index([startedAt])
```

- **Detalhes**: aplicar com `npx prisma db push` e `npx prisma generate` (rodar de `apps/server`). A mudança é aditiva (não destrói dados; Neon aceita coluna nullable sem backfill). `roomId` nullable preserva registros legados/offline e não obriga o insert a ter o valor.
- **Por quê**: (a) guard de idempotência no banco (R7) exige localizar a partida por sala; (b) `@@index([startedAt])` acelera o filtro de período do ranking (R6); (c) analytics futuros (rematch, histórico por sala).
- **Como validar**: `npx prisma generate` sem erro; `npx prisma studio` mostra `roomId` e `startedAt` indexados no modelo.

### Passo 5 — Módulo `gamePersistence.ts`

- **Arquivos**: `apps/server/src/db/gamePersistence.ts` (novo)
- **O que fazer**: criar o módulo com:
  1. `export interface GamePersistenceInput`:
     - `roomId: string`, `mode: GameMode`, `config: BoardConfig`, `startedAt: Date`, `endedAt: Date`, `reason: GameEndReason`,
     - `scoreboard: Array<{ playerId: string; score: number; rank: number }>`,
     - `actions: Record<string, PlayerAction[]>`, `explodedPlayers: string[]`.
  2. `persistedKeys: Set<string>` (chave `` `${roomId}:${startedAt.getTime()}` ``) + helper `isAlreadyPersisted(input)`.
  3. `export async function persistMatch(input: GamePersistenceInput): Promise<string | null>`:
     - Se `input.scoreboard.length === 0` → `console.warn` e `return null` (ninguém na partida — nada a gravar).
     - Se `isAlreadyPersisted(input)` → `return null` (guard em memória).
     - Guard no banco: `prisma.match.findFirst({ where: { roomId: input.roomId, startedAt: input.startedAt } })` → se existir, marca no Set e `return null`.
     - Dentro de `prisma.$transaction(async (tx) => { ... })`:
       a. `tx.match.create({ data: { mode, boardRows, boardCols, mineCount, status: 'finished', startedAt, endedAt, roomId, players: { create: scoreboard.map(...) } } })` — cada `MatchPlayer`: `userId`, `score`, `exploded: input.explodedPlayers.includes(playerId)`, `rank`, `actions: input.actions[playerId] ?? []` (o campo é `Json?`, aceita array vazio — evitar `undefined`).
       b. Para cada entrada do scoreboard: `const stats = await tx.stats.findUnique({ where: { userId } })`; computar em JS puro: `isVictory` (regra R2), `currentStreak`/`maxStreak` (R3), `rank` (R4); `tx.stats.upsert({ where: { userId }, create: {...valores computados, matchesPlayed: 1, victories: isVictory ? 1 : 0, defeats: isVictory ? 0 : 1}, update: {...incrementos} })` — **criar com os valores absolutos já computados** (cobre usuários sem `Stats`, ex. contas antigas; o upsert é o guard).
       c. Para cada entrada: `const user = await tx.user.findUnique({ where: { id: userId } })`; `novoXp = user.xp + xpDaPartida` (R5); `tx.user.update({ where: { id: userId }, data: { xp: novoXp, level: levelForXp(novoXp) } })` (valores absolutos, não incremento — evita drift com o level).
     - Marca a chave no `persistedKeys` e `return match.id`.
  4. Funções puras exportadas (testáveis): `computeIsVictory(mode, reason, rank): boolean`, `computeXp(mode, score, isVictory): number`, `computeStreak(statsAtuais, isVictory)`.
- **Detalhes**: helpers de vitória/xp importam `XP_BASE_BY_MODE`, `XP_WIN_BONUS`, `XP_PER_SCORE_UNIT`, `levelForXp` de `@minado/shared` (passo 1) e `PlayerAction` de `./../game/GameManager.js`. N+1 dentro da transação é aceitável (salas pequenas, ≤ maxPlayers). Erros de validação de `rank` (null) → usar `rank ?? scoreboard.length`.
- **Por quê**: isola toda a lógica de banco em um módulo; transação = ou grava tudo ou nada; funções puras permitem teste unitário sem banco.
- **Como validar**: `npm run typecheck`. Teste unitário opcional (sem framework no server — validar via execução real, passo 8).

### Passo 6 — Wiring no `index.ts` (ponto único de persistência)

- **Arquivos**: `apps/server/src/index.ts`
- **O que fazer**: dentro do callback `onGameEnded` (L31–46), após os emits existentes, montar o input e disparar fire-and-forget:

```ts
import { persistMatch } from './db/gamePersistence.js'
// ...dentro do callback:
if (scoreboard.length > 0) {
  const endedAt = new Date()
  const board = room?.boardConfig
  if (board) {
    persistMatch({
      roomId,
      mode: game.mode,
      config: board,
      startedAt: new Date(game.startedAt),
      endedAt: new Date(game.endedAt ?? endedAt.getTime()),
      reason,
      scoreboard: scoreboard.map((e, i) => ({ playerId: e.playerId, score: e.score, rank: i + 1 })),
      actions: Object.fromEntries(game.actions),
      explodedPlayers: Array.from(game.explodedPlayers),
    }).catch((err) => console.error('[persistMatch]', err))
  }
}
```

- **Detalhes**: manter `if (reason === 'eliminated') return` (L32) e o broadcast intactos. O guard de `scoreboard.length === 0` existe de novo no módulo (defesa em profundidade). `game` é o 4º parâmetro do passo 3. **Não** usar `await` — não bloqueia o socket flow (R7).
- **Por quê**: `onGameEnded` é o único caminho que representa fim real (R-“como detectar”), e é compartilhado por `endGame` e `endByTimer` (verificado L203/L223) — um único ponto de persistência, sem duplicação nos handlers de socket.
- **Como validar**: `npm run typecheck`; partida de teste (passo 8) grava 1 Match + N MatchPlayer.

### Passo 7 — Ranking por período em `users.ts`

- **Arquivos**: `apps/server/src/routes/users.ts`
- **O que fazer**: reescrever o handler `GET /ranking` (L6–20):
  1. Ler `req.query.period`; validar contra `['global', 'weekly', 'monthly']`; inválido/ausente → `'global'`.
  2. `global` → query atual (top 100 `xp desc`, select atual).
  3. `weekly`/`monthly`:

```ts
const days = period === 'weekly' ? 7 : 30
const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
const agg = await prisma.matchPlayer.groupBy({
  by: ['userId'],
  where: { match: { startedAt: { gte: since } } },
  _sum: { score: true },
})
const ids = agg.map((a) => a.userId)
const users = await prisma.user.findMany({
  where: { id: { in: ids } },
  select: { id: true, username: true, avatarUrl: true, xp: true, level: true, stats: { select: { victories: true, matchesPlayed: true } } },
})
const scored = users.map((u) => ({
  ...u,
  periodScore: agg.find((a) => a.userId === u.id)?._sum.score ?? 0,
}))
scored.sort((a, b) => b.periodScore - a.periodScore || b.xp - a.xp || (b.stats?.victories ?? 0) - (a.stats?.victories ?? 0))
res.json(scored.slice(0, 100).map((u, i) => ({ rank: i + 1, ...u })))
```

  4. Resposta: mesmo shape de `global` + `periodScore` apenas nos períodos.
- **Detalhes**: o filtro usa `Match.startedAt` (L59 do schema — o modelo não tem `createdAt`). `groupBy` está disponível no Prisma Client gerado. Usuários sem partida no período ficam fora (intencional).
- **Por quê**: entrega R6 com uma query agregada, sem mudar o contrato existente (campo aditivo).
- **Como validar**: `curl "http://localhost:3001/api/users/ranking?period=weekly"` após uma partida — usuários com `periodScore > 0` ordenados; `period=global` inalterado; `period=abc` cai em `global`.

### Passo 8 — Validação integrada

- **Arquivos**: nenhum (procedimento)
- **O que fazer**, na ordem:
  1. `cd apps/server && npm run typecheck` — zero erros.
  2. `npx prisma db push && npx prisma generate` (aplicar o passo 4).
  3. `npm run dev-server` (root) + `npm run dev` (web). Criar conta, sala com 2+ abas, jogar até o fim (ganhar, timer, battle-royale eliminação→last_standing).
  4. `npx prisma studio`: conferir `Match` (status `finished`, `endedAt`, `roomId`, board dims), `MatchPlayer` (score/rank/exploded/actions preenchidas), `Stats` (contadores + streaks + rank) e `User.xp/level` atualizados.
  5. Rejogar a MESMA sala (novo `startedAt` → nova linha `Match` — comportamento esperado; mesmo `roomId:startedAt` nunca duplica).
  6. `curl "http://localhost:3001/api/users/ranking?period=weekly"` e `...?period=monthly`.
- **Como validar**: checklist dos critérios de aceite abaixo, 100% verdes.

## 5. Contratos (Prisma/API)

### Prisma (`apps/server/prisma/schema.prisma`)

```prisma
model Match {
  id        String   @id @default(cuid())
  mode      String
  boardRows Int
  boardCols Int
  mineCount Int
  status    String   @default("playing")
  startedAt DateTime @default(now())
  endedAt   DateTime?
  roomId    String?  @index          // NOVO (SPEC 02)
  players   MatchPlayer[]

  @@index([startedAt])               // NOVO (SPEC 02)
}
```

`MatchPlayer` e `Stats` **sem mudança de schema** (campos existentes passam a ser preenchidos).

### API — `GET /api/users/ranking?period=global|weekly|monthly`

```json
[
  {
    "rank": 1,
    "id": "clx...",
    "username": "pablo",
    "avatarUrl": null,
    "xp": 385,
    "level": 2,
    "stats": { "victories": 3, "matchesPlayed": 4 },
    "periodScore": 850
  }
]
```

`periodScore` só existe em `weekly`/`monthly`. `global` mantém o shape atual (sem `periodScore`).

### Formato de `MatchPlayer.actions` (JSON)

```json
[
  { "type": "reveal", "row": 4, "col": 7, "ts": 1722600000123 },
  { "type": "flood-fill", "row": 4, "col": 7, "ts": 1722600000145 },
  { "type": "flag", "row": 2, "col": 3, "ts": 1722600000210 },
  { "type": "explode", "row": 5, "col": 9, "ts": 1722600000900 }
]
```

Máximo 500 entradas por jogador (as mais recentes; as antigas são descartadas).

## 6. Critérios de aceite (checklist testável)

- [ ] `cd apps/server && npm run typecheck` sem erros.
- [ ] Toda partida com fim real (win/timeout/complete/last_standing) gera **exatamente 1** `Match` com `status='finished'`, `endedAt`, `roomId`, dims corretas do board.
- [ ] `MatchPlayer` gerado para **cada** jogador do scoreboard final, com `score`, `rank`, `exploded` e `actions` (não-null; ≤ 500 por jogador).
- [ ] Eliminação individual no battle-royale (jogo continua) **não** gera `Match`.
- [ ] `Stats`: `victories` +1 só para o rank 1 (ou todos no coop `win`); `defeats` +1 para os demais; `matchesPlayed` +1 para todos; `currentStreak` incrementa na vitória e zera na derrota; `maxStreak` nunca decresce; `rank` = melhor rank histórico.
- [ ] `User.xp` aumenta de forma determinística (`base + winBonus + floor(score/10)`); `level = levelForXp(novoXp)`.
- [ ] Partida duplicada (mesmo `roomId:startedAt` — ex.: evento repetido) não gera segunda gravação (guard memória + banco).
- [ ] Partida vazia (scoreboard `[]`) não grava nada e loga warning.
- [ ] `/api/users/ranking?period=weekly|monthly` ordena por soma de `score` dos últimos 7/30 dias com desempate xp→victories; `global` e parâmetro inválido mantêm comportamento atual.
- [ ] Durante uma partida, a persistência em andamento **não** atrasa nem bloqueia events de socket (fire-and-forget; log de erro em falha).
- [ ] Usuário sem linha `Stats` (conta antiga) recebe `Stats` criado pelo upsert ao fim da partida.

## 7. Fora de escopo

- **Achievements / UserAchievement** (sem write path — spec futura).
- **Histórico de partidas no cliente** (`ResultPage` lê `lastMatchResult` da memória; buscar do banco é outra spec).
- **Persistência de partida abandonada** (sala deletada com 0 players — `RoomManager.removePlayer` L143–146) e **reconexão/rejoin** pós-fim.
- **Ranking global por rating/ELO**, rankeadas ou temporadas; **páginação** do ranking (`take: 100` fixo).
- **Fog-of-war completo** (visibilidade server-side) — apenas constantes de XP entram aqui.
- **Multi-account / smurf / anti-cheat**.
- **Mudanças no frontend** (shape aditivo só: `periodScore`).

## 8. Riscos e notas

- **Neon + schema**: `npx prisma db push` na coluna nullable `roomId` é aditivo e seguro; rodar `prisma generate` antes do typecheck para o client conhecer o novo campo.
- **`as any` em `getScoreboard`** (GameManager L416): mantido; ranks são re-derivados em `index.ts`. Limpeza de tipos é opcional e isolada.
- **Empate de score**: ranks únicos por construção (índice do sort estável). Se um dia quiserem empate amigável no rank, isso muda R2/R4 — decisão consciente de produto, documentada aqui.
- **N+1 dentro da transação**: aceitável (≤ maxPlayers por partida). Se salas crescerem muito, migrar para `createMany` + `increment` com leitura prévia fora da transação.
- **`actions` com array vazio**: Prisma aceita `[]` em `Json?`; nunca passar `undefined`.
- **Edição do shared**: sem build (main → `src/index.ts`), mas **requer reinício do server** para o `tsx watch` recompilar dependência externa — ou simplesmente tocar em qualquer arquivo do server.
- **`startedAt` como filtro de período** (não existe `createdAt` no `Match`) — qualquer consulta/analytics futura deve usar `startedAt` ou renomear com migração própria.
- **Regressão de rank do usuário**: `Stats.rank` é "melhor rank de todos os tempos" (menor número) — nunca piora; `level` nunca regride (monótono).
- **Timer em `timeLimit=0`**: `startGame` L128–130 só cria timer com `timeLimit > 0`; partida sem timer termina por win/complete/last_standing — caminhos já cobertos pelo mesmo `onGameEnded`.
