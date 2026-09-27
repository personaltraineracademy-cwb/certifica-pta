# Certificados PTA

MVP para organizar eventos, importar participantes, emitir certificados em PDF e validar sua autenticidade por código público ou QR Code.

Produção: [certifica-kohl.vercel.app](https://certifica-kohl.vercel.app)

## Stack

- Next.js 16, React 19, TypeScript e Tailwind CSS
- Clerk para autenticação e organizações
- Neon Postgres com Drizzle ORM
- `pdf-lib` e QR Code para geração dos certificados
- Vercel para execução e deploy

## Rodar localmente

As variáveis de ambiente ficam em `.env.local` e não entram no Git.

```bash
npm install
npm run db:setup
npm run dev
```

Abra `http://localhost:3000`.

## Credenciais da demonstração

- Evento: `summit-curitiba-2026`
- E-mail: `ana@example.com`
- Ingresso: `CERT-2026-001`

## Comandos

```bash
npm run lint
npm test
npm run build
npm run db:migrate
npm run db:seed
```

## Segurança do MVP

- Área administrativa protegida por usuário e organização do Clerk.
- Todas as consultas administrativas são isoladas por organização.
- Emissão pública exige e-mail mais código individual do ingresso.
- Sessão pública curta em cookie `HttpOnly`.
- Certificados usam códigos aleatórios longos; PDF privado exige sessão válida.
- Validação pública não expõe e-mail, ingresso ou listas de participantes.
- Tentativas, emissões, downloads, alterações e revogações ficam auditáveis.

O envio transacional por e-mail ficou fora desta primeira versão. O código do ingresso é o segundo fator operacional do fluxo público.
