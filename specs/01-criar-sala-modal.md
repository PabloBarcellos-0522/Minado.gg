# SPEC 01 — Criar Sala vira Modal (Lobby) + fix Switch + scrollbar global

## 1. Visão geral

O fluxo de criação de sala hoje vive numa **rota própria** (`/lobby/criar-sala`), que exige navegação e recarrega o contexto do Lobby. Esta spec converte esse fluxo em um **modal** aberto a partir do Lobby (3 pontos de entrada), mantendo o contrato de criação (`room:create`/`room:created`) intacto. Aproveitando a mudança, corrigimos dois problemas de UI confirmados:

1. **Scrollbar sem estilo**: o repo tem **zero** CSS de scrollbar (grep por `webkit-scrollbar|scrollbar-color|scrollbar-width` = 0 matches) — a barra do navegador não acompanha o dark mode.
2. **Switch desalinhado**: o knob ("bolinha") fica deslocado na vertical (inline-block ancorado na baseline, sem `flex items-center`) e para 4px antes do fim na horizontal (`translate-x-5` = 20px, mas o curso real é 24px).

O Switch também não está no styleguide (DESIGN.md linha 757–759 e item da lista "Known Gaps" na linha 927) — isso será resolvido aqui.

## 2. Estado atual

Todos os refs abaixo foram **verificados** contra o código (1º de ago de 2026).

| Item | Onde está hoje | Refs verificados |
|---|---|---|
| Rota de criação | `apps/web/src/App.tsx` | import linha 8; `<Route path="/lobby/criar-sala" element={<CreateRoomPage />} />` linha 75; bloco de rotas aninhadas 68–85; `ScrollToTop` 21–35 (faz `window.scrollTo(0,0)` a cada mudança de pathname) |
| Página de criação | `apps/web/src/pages/CreateRoomPage.tsx` (444 linhas) | função `CreateRoomPage()` 100–444; wrapper `<div className="min-h-dvh flex items-center justify-center px-5 py-12">` linha 178; `<Card variant="elevated" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">` **linha 179** (é a fonte da scrollbar da página); `<form onSubmit={handleCreateRoom} className="space-y-6">` linha 186; Nome da sala 188–198; Tabs de modo 200–228 (`modeOptions` const 13–74); Dificuldade 230–312 (`difficultyOptions` 93–98; checkbox "Tabuleiro personalizado" 264–270; inputs custom rows/cols/mines 274–310); Room Settings 314–402 (**Switch 324–327**; senha 330–341; range max players 343–363; range timer 365–401); Preview 404–427; `Alert` erro linha 429; botões Cancelar/Criar 431–438; lógica de submit 127–175 (validações: nome obrigatório 132–136, senha se privada 138–142, custom board 5–50 linhas/colunas 144–154, minas 1..rows×cols−1 155–161; sucesso chama `useRoomStore.getState().createRoom(...)` e `navigate('/sala/' + roomId, { replace: true, state: { justCreated: true } })` **linha 169**); `useState` 105–117; imports 1–11 |
| Pontos de entrada no Lobby | `apps/web/src/pages/LobbyPage.tsx` | header: `<Link to="/lobby/criar-sala"><Button variant="primary" size="lg">…Criar Sala</Button></Link>` 59–66; empty-state: `<Link to="/lobby/criar-sala"><Button variant="primary">Criar Sala</Button></Link>` 128–130; quick-mode cards: `onClick={() => (window.location.href = '/lobby/criar-sala?mode=' + mode.key)}` **linha 229** (full page reload — precisa virar open de modal com modo pré-selecionado via state); `import { Link } from 'react-router-dom'` linha 2; `GameModeCard` já aceita `onClick?: () => void` (GameModeCard.tsx linha 7) |
| Modal base | `apps/web/src/components/ui/Modal.tsx` | props `{ open, onClose, title?, children, className? }` 3–9; `<dialog>` 26–48; **`max-w-[420px]` hard-coded linha 33**; `style={{ backgroundColor: 'transparent' }}` **linha 39**; inner div (surface/borda/sombra) 41–46; `ModalActions` 51–59. Padrão de uso: `apps/web/src/pages/RoomPage.tsx` linhas 57–58 (estado) e modais 392–408 ("Sala Criada!") e 411–439 ("Convidar Amigos") |
| Switch | `apps/web/src/components/ui/Switch.tsx` (38 linhas) | track `<span>` classes linha 19 (`relative inline-block w-11 h-6 …`, **sem flex centering**); knob linhas 25–31 (`pointer-events-none inline-block h-5 w-5 …` com `translate-x-0`/`translate-x-5` **linha 29**; `ease-bounce` linha 28 — intencional, não é bug). Exportado em `apps/web/src/components/ui/index.ts` linha 10; **único consumidor é CreateRoomPage** (linha 324–327) |
| Tokens | `apps/web/src/index.css` | `@theme` 8–154 (`--color-bg` #f8fafc linha 75; `--color-surface` #ffffff 76; `--color-border` #e2e8f0 79); overrides `.dark` 159–236 (`--color-bg` #0f172a 224; `--color-surface` #1e293b 225; `--color-border` #334155 228; `--color-ink-muted` #94a3b8 230); `body` 247–256; `prefers-reduced-motion` 273–282 |
| Dark mode | `apps/web/src/components/ThemeProvider.tsx` (**NÃO** em `src/theme/`) | classe `light`/`dark` aplicada em `<html>` linhas 14–19; persistência `localStorage 'minado-theme'` |
| Contrato de criação | `apps/web/src/store/roomStore.ts` | assinatura `createRoom(name, mode, difficulty, isPrivate, password, maxPlayers, boardConfig?, timeLimit?) => Promise<string>` **linha 18**; impl 109–136; `socket.emit('room:create', …)` linha 134; resolve no `room:created` |
| Server | `apps/server/src/sockets/roomHandler.ts` 10–54 (`room:create`); `apps/server/src/rooms/RoomManager.ts` `createRoom` 21–61 | nenhuma mudança será feita aqui |
| Styleguide | `apps/web/src/pages/Styleguide.tsx` | demo de Modal 433–444 (já intitula "Criar Sala"); **não há demo de Switch**; estado `modalOpen` linha 108; import de Modal linha 9 |
| Docs | `DESIGN.md` | seção Switch 757–759 ("Referenced in codebase (not shown in styleguide)"); "Known Gaps" linha 927 ("Switch component exists but is not documented in the styleguide.") |

## 3. Requisitos e regras

1. **Modal, não rota**: `/lobby/criar-sala` deixa de renderizar página; a rota vira **redirect** para `/lobby` (backward compat). O redirect **ignora query params** (`?mode=…` morre — decisão do product owner; o deep-link via URL não é mais suportado).
2. O conteúdo da página vira o componente `<CreateRoomModal>` em `apps/web/src/components/blocks/CreateRoomModal.tsx` (bloco composto: átomos de `ui/` + store + navegação — padrão de `RoomCard`/`Navbar`). `pages/` fica reservado para rotas.
3. Os **3 pontos de entrada do Lobby** abrem o modal com `useState`:
   - botão do header;
   - botão do empty-state;
   - quick-mode cards, passando o modo pré-selecionado **via state** (nada de `window.location.href`).
4. O modal deve ficar **largo o bastante** para o formulário (640px), mantendo o default de 420px dos demais consumidores (`RoomPage`, `Styleguide`).
5. **Contrato `room:create` intacto** (store → socket → server não muda). Sucesso continua navegando para `/sala/:id` com `state.justCreated` (RoomPage lê isso na linha 58).
6. **Switch**: centralizar o knob verticalmente e corrigir o curso horizontal (`translate-x-6` = 24px). `ease-bounce` mantido. Adicionar demo no Styleguide e atualizar `DESIGN.md` (remover o gap conhecido).
7. **Scrollbar global** em `index.css` (Chrome/Safari via `*::-webkit-scrollbar`, Firefox via `scrollbar-color`/`scrollbar-width`), com valores claros em `:root` e escuros em `.dark`. Cobre scrollbar da página **e** do modal.
8. Nenhuma mudança em `packages/shared` nem no server.

## 4. Passos de implementação

### Passo 1 — `Modal.tsx`: prop `maxWidth` determinística

- **Arquivos**: `apps/web/src/components/ui/Modal.tsx`
- **O que fazer**: adicionar prop opcional `maxWidth?: string` ao `ModalProps` e aplicá-la **via inline style** no `<dialog>` (que já tem `style={{ backgroundColor: 'transparent' }}`). Quando a prop for omitida, manter a classe `max-w-[420px]` atual.
- **Detalhes**: NÃO use `className` para largura. Motivos (documente no PR):
  - o `className` vai parar no `<dialog>`, que já traz `max-w-[420px]` na lista de classes base (linha 33). No Tailwind v4 o JIT gera utilities arbitrárias de mesma propriedade em ordem de primeira ocorrência por arquivo — a ordem final no CSS é não-determinística em relação à ordem das classes no HTML. `max-w-[640px]` pode ou não vencer de `max-w-[420px]` dependendo de qual arquivo foi varrido antes;
  - o "conflito do background transparente": o `<dialog>` tem `bg-transparent` (31), `[&[open]]:bg-transparent` (35) **e** `style={{ backgroundColor: 'transparent' }}` (39) — o inline style vence qualquer classe, então consumidores **nunca** conseguem pintar o dialog via `className`. A superfície visível vem do inner div (41–46), que não recebe `className`. Ou seja: `className` em `Modal` só serve para o que não conflita — largura é justamente o caso conflitante.
  - Mudança mínima e compatível: inline `maxWidth` vence classe por especificidade (inline > stylesheet), então é determinístico.

  Alterações concretas:
  1. Linha 3–9, adicionar ao `ModalProps`: `maxWidth?: string;` (ex.: `"640px"`).
  2. Na assinatura (linha 11): desestruturar `maxWidth`.
  3. No array de classes (29–38): trocar a entrada `"max-w-[420px] w-full"` por `maxWidth ? "w-full" : "max-w-[420px] w-full"` (ou equivalentemente montar o array condicional).
  4. Linha 39, estender o style: `style={{ backgroundColor: "transparent", maxWidth: maxWidth ?? undefined }}`.
  - Não usar classes arbitrárias dinâmicas tipo `max-w-[${maxWidth}]` — o JIT do Tailwind não as gera.
- **Como validar este passo**: `npm run typecheck` em `apps/web`; abrir `/styleguide` e conferir que o modal demo continua com 420px; nenhum outro consumidor quebra (não passaram `maxWidth`).

### Passo 2 — Criar `CreateRoomModal` (componente novo)

- **Arquivos**:
  - novo: `apps/web/src/components/blocks/CreateRoomModal.tsx`
  - editar: `apps/web/src/components/blocks/index.ts` (adicionar export)
- **O que fazer**: criar o componente com a seguinte API:

  ```tsx
  interface CreateRoomModalProps {
    open: boolean
    initialMode?: GameMode | null
    onClose: () => void
  }
  export function CreateRoomModal({ open, initialMode, onClose }: CreateRoomModalProps)
  ```

  Mover para ele **todo** o conteúdo de `CreateRoomPage.tsx`:
  - consts: `modeOptions` (13–74), `DEFAULT_TIME_LIMITS` (76–82), `TIME_OPTIONS` (84–91), `difficultyOptions` (93–98);
  - todos os `useState` (105–117);
  - `handleModeChange` (119–122) e `handleCreateRoom` (127–175) **com as mesmas validações e mensagens**;
  - o JSX do form (186–438), **sem** o wrapper de página.

  Adaptações obrigatórias no shell:
  1. Substituir o wrapper `<div className="min-h-dvh flex items-center justify-center px-5 py-12">` + `<Card …>` (178–179) por:
     ```tsx
     <Modal open={open} onClose={onClose} title="Criar Sala" maxWidth="640px">
       <p className="text-ink-muted text-body mb-4">Configure sua partida e chame a galera</p>
       <form onSubmit={handleCreateRoom} className="space-y-6">
         {/* conteúdo movido de 186–438 */}
       </form>
     </Modal>
     ```
     O subtítulo que hoje vive no `CardHeader` (182) vira o `<p>` acima. Remover imports de `Card/CardHeader/CardTitle/CardContent`.
  2. **Scroll interno**: o modal pode ser mais alto que a viewport. Envolver o `<form>` (ou o conteúdo dele) em:
     ```tsx
     <div className="max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1">
     ```
     `100dvh - 6rem` = viewport menos padding interno do modal (p-6 = 3rem) e título (`h2` + `mb-2` ≈ 3rem). O `pr-1` abre gutter para a scrollbar (que passa a existir globalmente no Passo 7). Ajuste o valor se o preview em tela pequena mostrar corte.
  3. `Cancelar` (432): trocar `onClick={() => navigate(-1)}` por `onClick={onClose}` (fecha o modal e permanece no Lobby — esse é o ponto do modal).
  4. Sucesso (169): manter `navigate('/sala/' + roomId, { replace: true, state: { justCreated: true } })` — adicionar `onClose()` antes, para limpar o estado do Lobby.
  5. **Reset + pré-seleção de modo** (substitui `useSearchParams`/`preSelectedMode` das linhas 102–103): adicionar
     ```tsx
     useEffect(() => {
       if (open) {
         const mode = initialMode ?? 'competitive'
         setRoomName('')
         setSelectedMode(mode)
         setSelectedDifficulty('medium')
         setIsPrivate(false)
         setPassword('')
         setMaxPlayers(8)
         setCustomRows(16)
         setCustomCols(16)
         setCustomMines(40)
         setUseCustomBoard(false)
         setError('')
         setLoading(false)
         setSelectedTimeLimit(DEFAULT_TIME_LIMITS[mode])
       }
     }, [open, initialMode])
     ```
  - Imports finais do componente: `useState`, `useEffect`, `useNavigate` (mantido), `Button`, `Input`, `Label`, `Switch`, `Tabs`, `Alert` (de `@/components/ui/*`), `Modal` (de `@/components/ui/Modal`), `useRoomStore` (de `@/store/roomStore`), `GameMode`, `Difficulty`, `DIFFICULTY_CONFIG` (de `@minado/shared`).
- **Por que em `blocks/`**: é um bloco composto (átomos `ui/` + store + navegação), exatamente o papel de `RoomCard`/`Navbar`; `pages/` corresponde a rotas e este componente não é mais uma rota.
- **Como validar este passo**: `npm run typecheck`; abrir `/lobby` e conferir que o modal abre com layout correto (largura 640px, rolagem interna, fundo surface dentro do modal, backdrop escuro).

### Passo 3 — LobbyPage: abrir modal nos 3 pontos de entrada

- **Arquivos**: `apps/web/src/pages/LobbyPage.tsx`
- **O que fazer**:
  1. Adicionar estado e handler:
     ```tsx
     const [createModalOpen, setCreateModalOpen] = useState(false)
     const [modalInitialMode, setModalInitialMode] = useState<GameMode | null>(null)
     const openCreateModal = (mode?: GameMode) => {
       setModalInitialMode(mode ?? null)
       setCreateModalOpen(true)
     }
     ```
  2. Header (59–66): trocar o `<Link to="/lobby/criar-sala">…</Link>` por `<Button variant="primary" size="lg" onClick={() => openCreateModal()}>` (manter o conteúdo interno do botão).
  3. Empty-state (128–130): trocar por `<Button variant="primary" onClick={() => openCreateModal()}>Criar Sala</Button>`.
  4. Quick-mode (229): trocar `onClick={() => (window.location.href = '/lobby/criar-sala?mode=' + mode.key)}` por `onClick={() => openCreateModal(mode.key as GameMode)}` — **remove o full page reload** e o `?mode=` da URL; o modo chega via state (`initialMode`).
  5. Remover `import { Link } from 'react-router-dom'` (linha 2) — não haverá mais `Link` no arquivo (conferir com grep antes de remover).
  6. Renderizar o modal no final do JSX (dentro do root `<div className="min-h-dvh flex flex-col">`, após `</main>`):
     ```tsx
     <CreateRoomModal open={createModalOpen} initialMode={modalInitialMode} onClose={() => setCreateModalOpen(false)} />
     ```
     Import: `import { CreateRoomModal } from '@/components/blocks/CreateRoomModal'` (ou via `@/components/blocks` se exportado no index.ts — ver Passo 2).
- **Como validar este passo**: no `/lobby`, clicar nos 3 pontos de entrada; o quick-mode card abre o modal com o modo correto pré-selecionado (descrição do modo + `Resumo da Sala` refletem o modo escolhido); **sem reload de página** (devtools → Network: nenhum request novo).

### Passo 4 — Rota vira redirect + remoção da página

- **Arquivos**: `apps/web/src/App.tsx`; deletar `apps/web/src/pages/CreateRoomPage.tsx`
- **O que fazer**:
  1. Adicionar `Navigate` ao import da linha 1: `import { Navigate, Routes, Route, useLocation } from "react-router-dom"`.
  2. Remover o import da linha 8 (`CreateRoomPage`).
  3. Linha 75: trocar
     ```tsx
     <Route path="/lobby/criar-sala" element={<CreateRoomPage />} />
     ```
     por
     ```tsx
     <Route path="/lobby/criar-sala" element={<Navigate to="/lobby" replace />} />
     ```
  4. Deletar `apps/web/src/pages/CreateRoomPage.tsx` **somente depois** que o Passo 2 estiver compilando e o Passo 3 pronto (grep por `CreateRoomPage` deve retornar apenas docs em `docs/*.md` e `Plano_Implementacao_Minado.gg.md` — fora de escopo).
- **Detalhes/WHY**: `replace` evita voltar para uma rota morta com o botão back. O redirect **não repassa query params** — `/lobby/criar-sala?mode=x` cai no Lobby com o modal fechado (comportamento documentado; deep-link via URL foi descontinuado de propósito).
- **Como validar este passo**: digitar `/lobby/criar-sala` direto na URL → ser redirecionado para `/lobby`; mesma coisa com `?mode=battle-royale` no fim; back do browser não volta para a rota morta.

### Passo 5 — Fix do Switch (alinhamento + curso)

- **Arquivos**: `apps/web/src/components/ui/Switch.tsx`
- **O que fazer** (duas correções no track/knob):
  1. **Vertical**: o track (linha 17–24) passa de `'relative inline-block w-11 h-6 …'` para `'relative flex items-center w-11 h-6 …'`. O knob (25–31) passa de `inline-block` para `block`. Motivo: hoje o knob é `inline-block` e fica ancorado na baseline do texto do track (sem altura útil), afundando para baixo; `flex items-center` no track o centraliza verticalmente (h-6 = 24px, knob h-5 = 20px → 2px de margem em cada lado).
  2. **Horizontal**: trocar `checked ? 'translate-x-5' : 'translate-x-0'` (linha 29) por `checked ? 'translate-x-6' : 'translate-x-0'`. Motivo: track interno = 44px, knob = 20px → curso total = 44 − 20 = **24px** (`translate-x-6`). Com `translate-x-5` (20px) o knob parava 4px antes da borda direita.
  - Manter `ease-bounce` (linha 28) e `transition-colors` do track — comportamento intencional da marca.
- **Como validar este passo**: no modal (Passo 2) ou na demo do Styleguide (Passo 6): alternar o Switch — knob deve ficar verticalmente centrado e tocar a borda direita do track quando ligado, nos dois themes.

### Passo 6 — Switch no Styleguide

- **Arquivos**: `apps/web/src/pages/Styleguide.tsx`
- **O que fazer**:
  1. Import: adicionar `import { Switch } from '@/components/ui/Switch'` junto aos imports de `ui/` (linhas 3–10).
  2. Estado: junto de `modalOpen` (linha 108), adicionar `const [demoSwitchOn, setDemoSwitchOn] = useState(false)`.
  3. Nova seção entre o demo de Modal (bloco que termina na linha 444) e o de Tabs (linha 446):
     ```tsx
     <div className="mb-8 p-5 rounded-[14px] bg-surface border border-border">
       <h3 className="font-heading font-bold text-h5 mb-4">Switch</h3>
       <div className="flex flex-col gap-4">
         <label className="flex items-center gap-3">
           <Switch checked={demoSwitchOn} onChange={(e) => setDemoSwitchOn(e.target.checked)} />
           <span className="font-heading font-bold text-small text-ink">Sala privada ({demoSwitchOn ? 'ligado' : 'desligado'})</span>
         </label>
         <div className="flex items-center gap-3">
           <Switch checked defaultChecked onChange={() => {}} />
           <span className="font-heading font-bold text-small text-ink">Sempre ativo (ligado)</span>
         </div>
         <div className="flex items-center gap-3">
           <Switch checked={false} disabled />
           <span className="font-heading font-bold text-small text-ink-muted">Desabilitado</span>
         </div>
       </div>
     </div>
     ```
  - **WHY**: o Switch passa a ser um componente documentado/exibido — corrige o gap da linha 927 do DESIGN.md e dá referência visual para QA.
- **Como validar este passo**: `/styleguide` → seção Componentes → Switch: 3 estados visíveis, knob alinhado em todos; alternância funcional no primeiro; disabled não clicável.

### Passo 7 — Scrollbar global (light + dark)

- **Arquivos**: `apps/web/src/index.css`
- **O que fazer**: adicionar bloco de scrollbar entre as regras base (após `body`, ~linha 256) e o bloco `prefers-reduced-motion` (273). Usar os **tokens** `--color-border` / `--color-ink-muted` (que já invertem no `.dark`) para não duplicar valores:
  ```css
  /* =============================================================
     Scrollbar (global — página e modais)
     ============================================================= */
  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background-color: var(--color-border);
    border-radius: 999px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background-color: var(--color-ink-muted);
  }

  :root {
    scrollbar-color: var(--color-border) transparent;
    scrollbar-width: thin;
  }

  .dark {
    scrollbar-color: var(--color-border) transparent;
  }
  ```
- **Detalhes/WHY**: zero CSS de scrollbar hoje (grep = 0 matches) — a barra nativa do Windows/Chrome ficava branca/invisível no dark mode. `var(--color-border)` resolve para `#e2e8f0` (claro) ou `#334155` (escuro) no momento do cálculo, então o bloco `.dark` acima é explícito por decisão de produto (os tokens já se adaptam sozinhos). 8px + radius full = combina com o design system (scrollbar fina e arredondada). O bloco `.dark` pode ser omitido sem perda funcional; manter se quiser explicitar.
  - **WHY global e não por componente**: a regra cobre a página (hoje) e o modal interno (Passo 2) sem duplicação; `*::-webkit-scrollbar` alcança o `<dialog>` e qualquer container com `overflow`.
- **Como validar este passo**: rolar o Lobby e o modal de criar sala nos dois themes: scrollbar fina (8px), thumb na cor da borda do tema, hover mais escuro. Testar também no Firefox (`scrollbar-width: thin`).

### Passo 8 — DESIGN.md (Switch documentado + gap removido)

- **Arquivos**: `DESIGN.md`
- **O que fazer**:
  1. Substituir as linhas 757–759 (seção `#### Switch`) por:
     ```md
     #### Switch

     Toggle 44×24px (w-11 h-6) com knob branco de 20×20px (h-5 w-5) e sombra. Track: `bg-primary-500` quando ligado, `--color-border` quando desligado. Knob com curso de 24px (`translate-x-6`) e `ease-bounce`. Centralização vertical via `flex items-center` no track. Foco visível via `peer-focus-visible:ring-2` (ring token). Estados: ligado, desligado, disabled (opacity 50).
     ```
  2. Remover a linha 927 (`- Switch component exists but is not documented in the styleguide.`) da lista "Known Gaps".
- **Como validar este passo**: grep por "not shown in styleguide" em `DESIGN.md` retorna 0; seção Switch documentada; a lista de gaps não menciona mais o Switch.

### Passo 9 — Validação final (typecheck + lint + teste manual)

- **Arquivos**: nenhum (validação)
- **O que fazer**:
  1. Rodar (do diretório `apps/web`):
     ```bash
     npm run typecheck
     npm run lint
     ```
     Ambos devem passar sem novos erros.
  2. Script de teste manual (servidor e web rodando):
     1. Acessar `/lobby` autenticado.
     2. Clicar **Criar Sala** no header → modal abre (640px, backdrop escuro, sem navegação).
     3. Clicar em **Cancelar** → modal fecha, permanece no Lobby (URL continua `/lobby`).
     4. Abrir o modal pelo botão do empty-state (usar filtro que zera a lista, ex.: modo + dificuldade que não existem).
     5. Clicar no quick-mode card "Competitivo" → modal abre com o modo Competitivo pré-selecionado; repetir com "Battle Royale" → Range de jogadores mostra 10–50 e timer default 5 min.
     6. Validar campos: salvar sem nome → erro "Digite um nome para a sala"; marcar privada sem senha → erro "Salas privadas precisam de senha"; custom board com linhas 4 → erro "Linhas devem ser entre 5 e 50"; minas acima do máx → erro com o limite.
     7. Criar sala pública com nome + modo padrão → navega para `/sala/:id` e o modal "Sala Criada!" aparece (fluxo `justCreated` intacto).
     8. Alternar o Switch "Sala privada" → knob centrado e encostando na borda direita quando ligado (verificar nos themes claro e escuro).
     9. Esc fecha o modal quando aberto.
     10. Digitar `/lobby/criar-sala` na URL → redirect para `/lobby`; idem com `?mode=battle-royale` (query ignorada).
     11. Com o modal aberto e conteúdo longo (janela baixa), rolar: scrollbar fina de 8px com cor do tema (claro: #e2e8f0; escuro: #334155); página do Lobby com scroll também usa a mesma scrollbar.
     12. `/styleguide` → seção Componentes: demo do Switch (3 estados) funcionando; demo de Modal continua com 420px de largura.
     13. `/sala/:id` (fluxo pós-criação) continua funcionando normalmente (chat, prontidão etc. — smoke test apenas).

## 5. Contratos (socket/REST/types)

**Nenhuma mudança de socket/REST.** O payload de `room:create` emitido pela store (roomStore.ts linha 134) permanece:

```ts
{
  name: string
  mode: GameMode
  difficulty: Difficulty
  isPrivate: boolean
  password: string
  maxPlayers: number
  boardConfig?: { rows: number; cols: number; mines: number }
  timeLimit?: number
}
```

Respostas: `room:created` (room) ou `error` ({ code, message }) — inalterados. `packages/shared` intocado.

Mudanças de tipos (somente web):

```ts
// apps/web/src/components/ui/Modal.tsx
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  maxWidth?: string   // NOVO — ex.: "640px"; omisso = max-w-[420px] (comportamento atual)
}

// apps/web/src/components/blocks/CreateRoomModal.tsx (NOVO)
interface CreateRoomModalProps {
  open: boolean
  initialMode?: GameMode | null   // pré-seleção via state (quick-mode cards)
  onClose: () => void
}
```

## 6. Critérios de aceite (checklist testável)

- [ ] `/lobby/criar-sala` redireciona para `/lobby` (`replace`), com ou sem query params.
- [ ] Nenhuma referência a `CreateRoomPage` em `apps/web/src` (arquivo deletado; imports removidos).
- [ ] `CreateRoomModal` em `apps/web/src/components/blocks/`, com `open`/`initialMode`/`onClose`; exportado no `blocks/index.ts`.
- [ ] Os 3 pontos de entrada do Lobby abrem o modal; nenhum `window.location.href` nem `<Link to="/lobby/criar-sala">` resta em `LobbyPage.tsx`.
- [ ] Quick-mode card abre o modal com o modo pré-selecionado (descrição do modo e defaults de timer/jogadores corretos por modo).
- [ ] Modal com largura 640px e conteúdo rolável internamente (`max-h` + `overflow-y-auto`), mantendo os demais modais (RoomPage/Styleguide) em 420px.
- [ ] Cancelar fecha o modal sem navegar; Esc também.
- [ ] Validações idênticas às atuais (nome, senha se privada, custom board 5–50, minas 1..rows×cols−1) com as mesmas mensagens em PT-BR.
- [ ] Criar sala: `room:create` emitido (payload inalterado) → `navigate('/sala/' + roomId, { replace: true, state: { justCreated: true } })`.
- [ ] Switch: knob centralizado verticalmente e com curso de 24px (`translate-x-6`) nos dois themes; `ease-bounce` mantido.
- [ ] Styleguide mostra demo de Switch (ligado/desligado/disabled) e `DESIGN.md` não lista mais o gap do Switch.
- [ ] Scrollbar global: 8px, thumb `--color-border` (claro #e2e8f0 / escuro #334155), hover `--color-ink-muted`; Firefox com `scrollbar-width: thin`.
- [ ] `npm run typecheck` e `npm run lint` (em `apps/web`) passam sem novos erros.
- [ ] Fluxo pós-criação (`/sala/:id` + modal "Sala Criada!") intacto.

## 7. Fora de escopo

- Fechar o modal clicando no backdrop (o `<dialog>` nativo não faz isso hoje; comportamento atual preservado).
- Animações de entrada/saída do modal (o dialog usa `open:shadow-lg`; transições seriam uma spec própria de motion).
- Layout de 2 colunas de fato dentro do modal — o form segue o layout atual em coluna única (a largura 640px apenas acomoda melhor os grids internos).
- Persistência/rascunho dos valores do form entre aberturas (reset total no open é o comportamento definido).
- Suporte a `?mode=` via URL (descontinuado por decisão de produto; o redirect ignora query params).
- Atualizar `docs/ARCHITECTURE.md`, `docs/ARQUITETURA.md` e `Plano_Implementacao_Minado.gg.md` (referenciam a rota/página; anotar para uma spec de docs).
- Mudanças no server (`roomHandler.ts`, `RoomManager.ts`) ou em `packages/shared`.

## 8. Riscos e notas

- **JIT do Tailwind v4**: nunca usar classes arbitrárias dinâmicas (`max-w-[${x}]`) — o Passo 1 resolve largura via inline style justamente para evitar esse problema.
- **`<dialog>` e top layer**: o dialog nativo renderiza em top layer com focus trap próprio; o `max-h` interno do modal é `calc(100dvh-6rem)` — conferir em telas pequenas (≤640px de altura) e ajustar se o form cortar o rodapé de botões (reduzir o valor ou mover os botões para fora do container de scroll, dentro de `ModalActions`).
- **Ordem dos passos**: o Passo 4 (deletar a página) só deve acontecer depois que o Passo 2 compila — evita janela com build quebrado no meio da implementação.
- **Estado do Lobby**: `createModalOpen`/`modalInitialMode` são locais ao `LobbyPage`; como o modal navega para `/sala/:id` no sucesso, não há necessidade de limpar nada após sucesso.
- **`Link` import**: remover de `LobbyPage.tsx` somente após confirmar que não resta uso (grep).
- **Inconsistência pré-existente**: `blocks/index.ts` só exporta 5 dos 8 blocos (Leaderboard/ProfileCard/MatchCard ficaram de fora). Este spec adiciona o `CreateRoomModal` ao index — se o time preferir o padrão de import direto por arquivo (como o LobbyPage faz hoje), o export no index pode ser omitido sem prejuízo funcional.
- **Comportamento herdado**: manter `ease-bounce` no Switch (linha 28) — é identidade da marca, não bug.
