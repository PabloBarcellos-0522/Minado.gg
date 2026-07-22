# Ideias para um Site com Jogo Campo Minado Multiplayer

## Conceito

Transformar o Campo Minado em uma experiência multiplayer competitiva e
cooperativa.

## Modos de jogo

### Competitivo (2 a 8 jogadores)

- Mesmo tabuleiro para todos.
- Casas abertas ficam com a cor do jogador.
- Pontuação por casas seguras e bombas marcadas.
- Penalidade ao explodir.
- Vitória por maior pontuação.

### Opção vários tabuleiros

- Opção do modo competitivo
- 3 a 5 segundos de penalidade ao explodir
- Um tabuleiro para cada jogador
- Vence quem terminar primeiro

### Cooperativo

- Todos limpam o tabuleiro juntos.
- Chat em tempo real.
- Sistema de ping.
- Contador de erros compartilhado.
- Dificuldade crescente.

### Battle Royale

- Muitos jogadores iniciam.
- Quem explode é eliminado.
- Rodadas com tabuleiros menores.
- Último sobrevivente vence.

## Funcionalidades

- Login (Google, Discord, GitHub ou conta própria)
- Perfil com avatar, XP, nível e estatísticas
- Salas públicas e privadas
- Ranking global, semanal e mensal
- Personalização de bandeiras, cursor e tabuleiro

## Tecnologias

### Front-end

- React
- TypeScript
- Tailwind CSS

### Back-end

- Node.js
- Express
- Socket.IO

### Banco de dados

- PostgreSQL
- Redis

### Hospedagem

- Vercel
- Railway ou Render para websocket
- Supabase ou Neon

## Estrutura

Home → Lobby → Sala → Partida → Resultado → Ranking

## Sistema de Pontuação

Ação Pontos

---

Abrir casa segura +10
Área grande +30
Marcar bomba corretamente +25
Marcar bomba errada -15
Explodir -50
Vitória +200

## Recursos Extras

- Muitos efeitos para gameplay
- Modo escuro
- Replays
- Histórico
- Anti-trapaça
- Conquistas
- Missões diárias
- Convites por link
- Emojis rápidos
- Notificações

## Diferencial

### Fog of War

Cada jogador possui visão limitada do tabuleiro e precisa cooperar para
explorar o mapa.

- Todos cooperam para limpar o tabuleiro
- 1 erro e todos perdem

## Fluxo

Entrar → Login → Lobby → Sala → Partida em tempo real → Resultado →
Ranking → Nova partida
