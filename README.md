# Campinho Conectado

Aplicativo de gestão para associações e clubes de futebol amador. Ele reúne jogos, elenco, mensalidades, avisos e o chat da diretoria num lugar só. Funciona no navegador do celular, pode ser instalado como app (PWA) e pode virar app Android/iOS com o Capacitor.

## O que o app faz

- **Vários clubes por conta.** Cada pessoa pode participar de mais de um clube, com um cargo diferente em cada um. Quem cria o clube vira presidente e convida os outros por um **código de convite**.
- **Cargos e permissões por clube:**

  | Ação | Presidente | Diretoria | Técnico | Jogador |
  |---|:-:|:-:|:-:|:-:|
  | Editar dados do clube, excluir clube | ✓ | | | |
  | Mudar cargos e remover associados | ✓ | só técnicos e jogadores | | |
  | Criar e editar times | ✓ | ✓ | | |
  | Elenco, jogos e resultados | ✓ | ✓ | ✓ | |
  | Gerar mensalidades e dar baixa | ✓ | ✓ | | |
  | Publicar avisos | ✓ | ✓ | | |
  | Confirmar presença, ver tudo, chat geral | ✓ | ✓ | ✓ | ✓ |

- **Início:** placar do próximo jogo com "Vou" / "Não vou", situação da sua mensalidade, campanha do clube (V-E-D), último resultado, avisos e artilharia.
- **Jogos:** marcar jogos contra times de fora ou entre times do próprio clube, lançar o placar, cancelar e ver o histórico.
- **Times:** categorias do clube (Principal, Sub-17, Veteranos…) com cores, escudo, técnico e elenco. Cada jogador tem número, posição, situação e os números da temporada.
- **Mensalidades:** cada associado vê as suas e a chave PIX do clube. A diretoria gera as cobranças do mês para todos de uma vez, dá baixa informando a forma de pagamento e acompanha quanto entrou. Associados podem ser marcados como isentos.
- **Pagamento online (Mercado Pago):** cada clube conecta a própria conta, e o associado paga com PIX (QR Code ou copia e cola) ou cartão. A baixa acontece sozinha quando o pagamento é aprovado.
- **Google:** "Entrar com Google" (site e Android), "Adicionar à agenda" em cada jogo, link da agenda do clube para assinar no Google Agenda, e mapa com "Como chegar" no local do jogo.
- **Chat:** três canais. O Geral é para todos, o Comissão técnica para técnicos e diretoria, e o Diretoria só para presidente e diretoria.

## Tecnologias

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, wouter
- **Backend:** Node.js, Express 5, TypeScript (executado com `tsx`)
- **Banco:** PostgreSQL com Drizzle ORM
- **Login:** e-mail e senha (bcrypt) com token JWT

## Estrutura

```
client/            app React
  src/pages/       uma tela por arquivo
  src/components/  componentes (games/, squad/, layout/, ui/ = shadcn)
  src/lib/         API, login, clube ativo, tema, formatação
server/            API Express
  routes/          auth, clubs, squad (times/jogadores), games, dues, chat, overview
  lib/             autenticação, contexto do clube, erros, montagem das respostas
shared/            código usado pelos dois lados
  schema.ts        tabelas do banco
  roles.ts         cargos e permissões
  validation.ts    validação dos dados (zod)
  api.ts           formato das respostas da API
docs/              requisitos originais e telas de referência
```

## Rodando no seu computador

Pré-requisitos: Node.js 20 ou mais novo e um banco PostgreSQL. O [Neon](https://neon.tech) tem um plano gratuito.

```sh
npm install
cp .env.example .env      # preencha DATABASE_URL e JWT_SECRET
npm run db:push           # cria as tabelas no banco
npm run dev               # abre em http://localhost:5000
```

Outros comandos:

| Comando | Para que serve |
|---|---|
| `npm run build` | gera os arquivos do app em `dist/public` |
| `npm start` | roda em modo produção (precisa do build antes) |
| `npm run check` | confere os tipos do TypeScript |
| `npm run db:studio` | abre um painel para ver e editar o banco |

## Publicando

### Render (recomendado)

1. Crie um banco gratuito no [Neon](https://neon.tech) e copie a *connection string*.
2. No [Render](https://render.com), clique em **New → Blueprint** e escolha este repositório. O arquivo `render.yaml` já configura tudo.
3. Quando pedir, cole a connection string em `DATABASE_URL`. O `JWT_SECRET` é gerado sozinho.

O build já cria as tabelas no banco.

### Replit

Importe o repositório, adicione `DATABASE_URL` e `JWT_SECRET` em **Secrets** e clique em **Run**. Para publicar, use **Deploy**. O arquivo `.replit` já tem os comandos.

### App Android/iOS (Capacitor)

O app nativo precisa saber o endereço do servidor publicado:

```sh
VITE_API_URL=https://seu-app.onrender.com npm run build
npx cap add android        # só na primeira vez
npx cap sync
npx cap open android       # abre no Android Studio
```

## Integrações

### Entrar com Google

1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um projeto e configure a tela de consentimento OAuth (tipo Externo).
2. Crie um **ID do cliente OAuth → Aplicativo da Web**. Em *Origens JavaScript autorizadas*, coloque o endereço do site (ex.: `https://campinho-conectado.onrender.com`) e `http://localhost:5000`.
3. Crie outro **ID do cliente OAuth → Android**, com o pacote `br.com.campinhoconectado.app` e o SHA-1 que está em `android-config/README.md`.
4. Coloque o ID do cliente **Web** na variável `GOOGLE_CLIENT_ID` do servidor. O app lê esse valor do servidor, então não é preciso gerar outro APK.

### Mercado Pago

Não há configuração no servidor. O presidente de cada clube abre **Clube → Pagamento online** e cola o *Access Token de produção* da conta Mercado Pago do clube. O token fica guardado criptografado. O aviso de pagamento (webhook) é configurado automaticamente em cada cobrança.

### Google Agenda e Maps

Não precisam de chave. Os links são gerados pelo próprio app.

## Próximos passos sugeridos

- Envio de fotos (escudo, foto de perfil) direto do celular
- Escalação e súmula por jogo (gols e cartões lançados por partida)
- Notificações de jogo marcado e de mensalidade vencendo
