# Plano de Implementação — Minado.gg

> Base analisada: `Ideias_Campo_Minado_Multiplayer.md`, `index.html` (design system) e `src/styles/*.css` (tokens.css, components.css, game.css). As pastas `src/components` e `src/blocks` existem mas estão vazias — ou seja, hoje você tem **apenas o design system em HTML/CSS puro**, ainda sem código de aplicação (React/lógica de jogo/backend).

---

## 1. Estado atual do projeto

| Item                                                                             | Status                       |
| -------------------------------------------------------------------------------- | ---------------------------- |
| Design tokens (cores, espaçamento, tipografia, sombra, raio)                     | ✅ Pronto (`tokens.css`)     |
| Componentes atômicos em CSS (botão, input, badge, modal, toast, tabs, tabela...) | ✅ Pronto (`components.css`) |
| Estilos do jogo (tabuleiro, célula, mascote, banners, FX de boom/confete)        | ✅ Pronto (`game.css`)       |
| Componentes React (`src/components`)                                             | ✅ Pronto (`src/components`) |
| Blocos compostos (`src/blocks`)                                                  | ❌ Vazio                     |
| Lógica de jogo (geração de tabuleiro, flood fill, etc.)                          | ❌ Não existe                |
| Backend / Socket.IO / banco de dados                                             | ❌ Não existe                |

Ou seja: o design system está muito maduro, mas o "esqueleto" da aplicação (rotas, componentes React, estado, lógica de jogo, multiplayer) precisa ser criado do zero. Esse é o foco deste plano.

---

## 2. Stack recomendada (confirmando o que já está no seu .md)

- **Frontend:** React + TypeScript + Vite + Tailwind ou CSS para auxiliar o Tailwind
- **Realtime:** Socket.IO (cliente + servidor)
- **Backend:** Node.js + Express + Socket.IO
- **Banco de dados:** PostgreSQL (dados persistentes: usuários, estatísticas, ranking) + Redis (estado de salas em tempo real, filas, pub/sub entre instâncias)
- **Auth:** OAuth (Google, Discord, GitHub) + fallback e-mail/senha (ex: Lucia Auth ou Auth.js)
- **Hospedagem:** Vercel (frontend estático) + Railway/Render (servidor Socket.IO, que precisa de conexão persistente) + Supabase/Neon (Postgres gerenciado)

---

## 3. Estrutura de pastas sugerida

```
Minado.gg/
├── apps/
│   ├── web/                      # Frontend React
│   │   ├── src/
│   │   │   ├── pages/            # Rotas (ver seção 4)
│   │   │   ├── components/       # Atômicos (Button, Input, Badge, Avatar, Modal...)
│   │   │   ├── blocks/           # Compostos (RoomCard, Leaderboard, ChatPanel, Roster...)
│   │   │   ├── game/              # Lógica de jogo (client-side)
│   │   │   │   ├── board.ts       # Geração, flood fill, tipos
│   │   │   │   ├── useGame.ts     # Hook de estado de partida
│   │   │   │   └── fx.ts          # Boom, confete, shake
│   │   │   ├── net/                # Cliente Socket.IO, eventos tipados
│   │   │   ├── store/              # Zustand/Redux (estado global: usuário, sala, sessão)
│   │   │   ├── styles/             # tokens.css, components.css, game.css (mover para cá)
│   │   │   └── App.tsx / router.tsx
│   │   └── index.html
│   └── server/                   # Backend
│       ├── src/
│       │   ├── sockets/           # Handlers de eventos (room, move, chat, ping)
│       │   ├── game/              # Lógica de jogo (server-side, autoritativa)
│       │   ├── routes/            # REST (auth, perfil, ranking)
│       │   ├── db/                # Prisma schema + client
│       │   └── redis/             # Pub/sub, estado de salas
│       └── prisma/schema.prisma
└── packages/
    └── shared/                   # Tipos e constantes compartilhados (board, eventos socket, pontuação)
```

**Ponto crítico de arquitetura:** a lógica do campo minado deve existir em dois lugares com o mesmo contrato de tipos (via `packages/shared`):

- **Servidor** = fonte da verdade (gera o tabuleiro, valida jogadas, calcula pontuação, decide vitória/derrota). Nunca confie no cliente para saber onde estão as minas.
- **Cliente** = só renderiza o estado recebido e faz previsão otimista de UI (ex: animação de clique antes da confirmação do servidor).

---

## 4. Páginas e rotas

Baseado no fluxo do seu `.md` (Entrar → Login → Lobby → Sala → Partida → Resultado → Ranking → Nova partida) e nos blocos já desenhados no `index.html`.

| Rota                     | Página                           | Componentes principais (já existem no design system)                                                                                         |
| ------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                      | **Home / Landing**               | Navbar, hero com mascote, GameModeCard (grid dos 4 modos), CTA "Jogar agora"                                                                 |
| `/login`                 | **Login**                        | Card, botões OAuth (Google/Discord/GitHub), Input, Alert de erro                                                                             |
| `/lobby`                 | **Lobby**                        | Navbar, lista de RoomCard (salas públicas), botão "Criar sala", filtros (modo, nº jogadores), Tabs (Salas/Amigos/Ranking)                    |
| `/lobby/criar-sala`      | **Criar sala** (modal ou página) | Modal, Input (nome), Choice (modo, dificuldade, tabuleiro), Switch (privada/pública)                                                         |
| `/sala/:id`              | **Sala de espera**               | PlayerRoster, ChatPanel, badge de status "Host/Pronto", botão "Iniciar partida", convite por link                                            |
| `/partida/:id`           | **Partida (jogo)**               | Board + board-cell, Mascote, ChatPanel colapsável, ping-row (reações rápidas), HUD (timer, contador de minas, pontuação ao vivo por jogador) |
| `/partida/:id/resultado` | **Resultado**                    | Banner (win/lose), tabela de pontuação final, MatchCard, botão "Revanche" / "Voltar ao lobby"                                                |
| `/ranking`               | **Ranking**                      | Tabs (Global/Semanal/Mensal), Leaderboard, tabela paginada                                                                                   |
| `/perfil/:username`      | **Perfil**                       | ProfileCard, stat-pill (vitórias, sequência, patente), histórico de partidas, conquistas                                                     |
| `/perfil/editar`         | **Configurações de conta**       | Input, avatar upload, personalização (bandeira, cursor, tema do tabuleiro), tema claro/escuro                                                |
| `/replay/:matchId`       | **Replay** (recurso extra)       | Board em modo "player" com controles de tempo (play/pause/scrub)                                                                             |
| `*`                      | **404**                          | Mascote "explodido" + mensagem de humor                                                                                                      |

Sugestão de prioridade: implemente **Home → Login → Lobby → Sala → Partida → Resultado** primeiro (o "core loop"). Ranking, Perfil, Replay e Configurações vêm depois — são importantes mas não bloqueiam testar o jogo.

---

## 5. Componentes React a extrair do design system

Você já tem o CSS pronto; falta encapsular em componentes React tipados. Ordem sugerida:

**Atômicos (`src/components`)**

1. `Button` (variants: primary/secondary/accent/ghost/danger, sizes, loading, disabled)
2. `Input` + `Field` + `Label` + `Helper` (com estado de erro)
3. `Checkbox` / `Radio` / `Switch` (wrap de `.choice` e `.switch`)
4. `Badge`
5. `Avatar` (com fallback de iniciais + variante `bomb`)
6. `Alert` / `Toast` (Toast precisa de um `ToastProvider` + fila)
7. `Tooltip`
8. `Tabs`
9. `Modal` (wrap de `.modal-scrim` + `.modal`, com foco trap e `Esc` para fechar)
10. `Table`
11. `Progress`
12. `Skeleton`

**Blocos compostos (`src/blocks`)**

1. `Navbar`
2. `RoomCard`
3. `Leaderboard`
4. `ProfileCard`
5. `MatchCard`
6. `ChatPanel` (precisa de conexão com socket)
7. `PlayerRoster`
8. `GameModeCard` / `ModeGrid`

**Jogo (`src/game` + componentes específicos)**

1. `Board` (grid dinâmico, usa `--board-cols`)
2. `Cell` (estados: coberta, revelada, número 1–8, mina, bandeira, "segura", cor por jogador)
3. `Mascote` (happy/exploded, reage ao estado da partida)
4. `Banner` (win/lose)
5. `PingRow` (reações rápidas)
6. `FxBoom` / `FxConfetti` (efeitos, já existem as classes CSS `fx-boom`/`fx-confetti`)

Dica prática: comece migrando o próprio `index.html` (styleguide) para uma rota `/styleguide` dentro do app React — assim você valida que os componentes React renderizam **exatamente igual** ao HTML de referência antes de usá-los nas páginas reais.

---

## 6. Lógica de jogo — o que precisa ser implementado

### 6.1 Núcleo do Campo Minado (single board, base para todos os modos)

- **Geração do tabuleiro:** matriz `linhas x colunas`, distribuição aleatória de `N` minas, garantindo que a **primeira jogada nunca seja mina** (gerar minas só depois do primeiro clique, excluindo a célula clicada e vizinhas).
- **Cálculo de números:** para cada célula sem mina, contar minas nas 8 vizinhas.
- **Flood fill (revelar área vazia):** ao abrir uma célula com 0 minas vizinhas, revelar recursivamente/BFS todas as vizinhas até encontrar bordas com número.
- **Marcar bandeira / interrogação:** clique direito (ou long-press no mobile) alterna coberta → bandeira → interrogação → coberta.
- **Condição de vitória:** todas as células sem mina reveladas.
- **Condição de derrota:** célula com mina revelada (no modo cooperativo, derrota é coletiva).
- **Timer e contador de minas restantes** (minas totais − bandeiras colocadas).

### 6.2 Lógica específica multiplayer (por modo — do seu `.md`)

**Competitivo (mesmo tabuleiro):**

- Todos os jogadores recebem o **mesmo tabuleiro gerado no servidor**.
- Cada célula revelada guarda `revealedBy: playerId` → usada para colorir a célula com a cor do jogador.
- Pontuação incremental por jogador (ver tabela da seção 7), calculada **no servidor** a cada jogada.
- Ao explodir: aplica penalidade, mas o jogador continua na partida (não é eliminado).
- Fim de partida: tabuleiro 100% revelado (por qualquer combinação de jogadores) ou tempo esgotado → maior pontuação vence.

**Vários tabuleiros (corrida):**

- Cada jogador recebe seu **próprio tabuleiro independente** (mesma seed de dificuldade, minas diferentes por jogador ou mesma seed — decidir).
- Ao explodir: penalidade de tempo (3–5s de "congelamento" da UI, sem poder interagir).
- Vitória: primeiro a limpar o próprio tabuleiro corretamente.
- Precisa de um "espectador" simples mostrando o progresso (%) dos outros jogadores em tempo real, sem mostrar o tabuleiro deles (evita trapaça).

**Cooperativo:**

- Um único tabuleiro compartilhado, qualquer jogador pode clicar em qualquer célula.
- Contador de erros **compartilhado** (ex: "vidas" do time) — X erros = derrota geral.
- Dificuldade aumenta por fase/rodada (tabuleiro maior ou mais minas a cada rodada vencida).
- Chat + sistema de ping (usar `ping-row` do design system) para coordenar sem microfone.

**Battle Royale:**

- Muitos jogadores, tabuleiros menores por rodada.
- Ao explodir → jogador é **eliminado** (estado `eliminated: true`, não pode mais jogar, vira espectador).
- Servidor reduz o tamanho do tabuleiro / aumenta densidade de minas a cada rodada.
- Fim: último jogador não eliminado vence.

**Fog of War (diferencial do seu `.md`):**

- Cada jogador tem uma "janela de visão" (ex: raio de N células ao redor da última célula revelada por ele, ou por qualquer membro do time — decidir).
- Células fora da visão do jogador aparecem como neblina (usar sombreamento adicional sobre `board-cell`).
- Cooperativo por natureza: "1 erro e todos perdem" → contador de erros compartilhado = 0 tolerância.
- Tecnicamente é a lógica mais cara: o servidor precisa mandar **visões parciais e diferentes do tabuleiro para cada socket**, não o tabuleiro inteiro (senão dá pra "inspecionar" o payload no DevTools e trapacear vendo o tabuleiro completo).

### 6.3 Lógica de sala / lobby

- Criar sala: gera `roomId` curto (ex: 6 caracteres), define modo, dificuldade, pública/privada, senha opcional, máx. jogadores.
- Entrar em sala: por lista pública, por link de convite (`/sala/:id`), ou por código.
- Estado do jogador na sala: `waiting`, `ready`, `playing`, `spectating`.
- Host pode iniciar partida quando o mínimo de jogadores estiver pronto (regra por modo, ex: mín. 2 para competitivo).
- Reconexão: se o jogador cair, manter o slot por X segundos (ex: 30s) antes de liberar a vaga — evita perder a partida por queda de wifi.

### 6.4 Anti-trapaça (mencionado no seu `.md`)

- Nunca enviar posição das minas ao cliente antes de reveladas.
- Validar toda jogada no servidor (célula existe? já revelada? jogador ainda ativo? dentro do tempo da partida?).
- Rate limit de eventos socket por jogador (evita spam de cliques/flood de eventos).
- Em Fog of War, mandar apenas o recorte visível — nunca o tabuleiro completo.

---

## 7. Sistema de pontuação (do seu `.md`, para referência na implementação)

| Ação                      | Pontos |
| ------------------------- | ------ |
| Abrir casa segura         | +10    |
| Área grande (flood fill)  | +30    |
| Marcar bomba corretamente | +25    |
| Marcar bomba errada       | −15    |
| Explodir                  | −50    |
| Vitória                   | +200   |

Implementar como função pura `calculateScore(action, context)` em `packages/shared`, usada só pelo servidor (fonte da verdade), e espelhada no cliente apenas para exibir prévia otimista.

---

## 8. Modelo de dados (Postgres, via Prisma) — visão inicial

- **User**: id, username, email, avatarUrl, provider (google/discord/github/local), xp, level, createdAt
- **Stats**: userId, vitórias, derrotas, partidas jogadas, sequência atual, sequência máxima, patente
- **Match**: id, mode, boardConfig (linhas/colunas/minas), status, startedAt, endedAt
- **MatchPlayer**: matchId, userId, score, exploded (bool), rank final, ações (log para replay)
- **Room**: id (curto), hostId, mode, isPrivate, passwordHash?, maxPlayers, status
- **Achievement**: id, título, descrição, condição
- **UserAchievement**: userId, achievementId, unlockedAt

Estado **efêmero** de partida em andamento (tabuleiro, células reveladas, timers) fica em **Redis**, não no Postgres — só persiste no Postgres o resumo final (para ranking/histórico/replay).

---

## 9. Eventos Socket.IO — contrato inicial

**Cliente → Servidor**

- `room:join` `{ roomId }`
- `room:leave`
- `room:ready` `{ ready: boolean }`
- `room:start` (host)
- `game:reveal` `{ cellId }`
- `game:flag` `{ cellId }`
- `game:ping` `{ type: 'haha'|'oops'|'gg'|'heart' }`
- `chat:message` `{ text }`

**Servidor → Cliente**

- `room:state` (snapshot completo da sala: jogadores, status, config)
- `room:playerJoined` / `room:playerLeft`
- `game:started` `{ boardMeta }` (linhas, colunas, nº minas — nunca as posições)
- `game:cellRevealed` `{ cellId, value, revealedBy }` (ou lote, para flood fill)
- `game:cellFlagged` `{ cellId, playerId }`
- `game:scoreUpdate` `{ playerId, delta, total }`
- `game:playerEliminated` `{ playerId }` (battle royale)
- `game:ended` `{ result, scoreboard }`
- `chat:message` `{ from, text, ts }`
- `error` `{ code, message }`

---

## 10. Roadmap sugerido (fases)

**Fase 0 — Fundação (1–2 semanas)**

- Setup do monorepo (`apps/web`, `apps/server`, `packages/shared`)
- Migrar tokens/CSS para dentro do `web`
- Montar roteador (React Router) com as páginas da seção 4 como stubs vazios
- Extrair 5–6 componentes atômicos mais usados (Button, Input, Badge, Avatar, Modal)

**Fase 1 — Jogo single-player local (2–3 semanas)**

- Implementar lógica pura do campo minado (`board.ts`: gerar, revelar, flood fill, flag, vitória/derrota) 100% no cliente, sem rede ainda
- Montar `Board`/`Cell`/`Mascote`/`Banner` reais consumindo essa lógica
- Validar UX de clique, flood fill, timer, contador de minas

**Fase 2 — Backend + multiplayer básico (3–4 semanas)**

- Servidor Express + Socket.IO, lógica de jogo movida para o servidor (autoritativa)
- Salas (criar/entrar/lobby/roster) — modo Competitivo primeiro (é o mais simples de sincronizar: 1 tabuleiro, 1 evento por jogada)
- Persistência básica em Postgres (User, Match, MatchPlayer) e auth (ao menos login por conta própria, OAuth depois)

**Fase 3 — Mais modos (3–5 semanas)**

- Vários tabuleiros (corrida)
- Cooperativo (contador de erros compartilhado, dificuldade crescente)
- Battle Royale (eliminação, rodadas)
- Fog of War por último (é o mais complexo — visão parcial por jogador)

**Fase 4 — Social e retenção (contínuo)**

- Ranking global/semanal/mensal, perfil, conquistas, missões diárias
- Chat completo + pings, convites por link, notificações
- Replay de partidas, histórico
- Personalização (bandeiras, cursor, tema do tabuleiro), modo escuro (o toggle já existe no `index.html`, só falta persistir a preferência)

**Fase 5 — Polimento**

- Anti-trapaça (rate limit, validação server-side revisada)
- Performance (lazy loading de rotas, otimizar re-render do `Board` em tabuleiros grandes)
- Acessibilidade (contraste, navegação por teclado no tabuleiro, `prefers-reduced-motion` — já referenciado no CSS)
- Testes (lógica de jogo com testes unitários é prioridade — é a parte que não pode ter bug)

---

## 11. Próximos passos imediatos (o que fazer nesta semana)

1. Decidir: monorepo (`apps/web` + `apps/server`) ou dois repositórios separados.
2. Rodar `npm create vite@latest apps/web -- --template react-ts` e mover `tokens.css`, `components.css`, `game.css` para `apps/web/src/styles`.
3. Criar `packages/shared/src/board.ts` com os tipos `Cell`, `Board`, `GameMode` e as funções puras de geração/flood fill — isso desbloqueia tanto o protótipo client-only (Fase 1) quanto o servidor depois.
4. Extrair `Button`, `Input` e `Badge` como primeiros componentes React, comparando visualmente com o `index.html` atual.
5. Criar a rota `/partida-local` (sem rede) só para validar a lógica do tabuleiro rodando em React antes de entrar em multiplayer.

---

Se quiser, posso já começar a gerar código real (ex: `board.ts` com a lógica pura do campo minado, ou os primeiros componentes React) — é só me dizer por onde prefere começar.
