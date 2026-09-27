# Certificados PTA

MVP para organizar eventos, importar participantes, emitir certificados em PDF e validar sua autenticidade por código público ou QR Code.

Produção: [certifica-kohl.vercel.app](https://certifica-kohl.vercel.app)

## Stack

- Next.js 16, React 19, TypeScript e Tailwind CSS
- Firebase Authentication para acesso administrativo
- Cloud Firestore e Firebase Storage para dados e arquivos privados
- `pdf-lib` e QR Code para geração dos certificados
- Vercel para execução e deploy

## Rodar localmente

As variáveis de ambiente ficam em `.env.local` e não entram no Git.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Comandos

```bash
npm run lint
npm test
npm run build
```

## Segurança do MVP

- Área administrativa protegida pelo Firebase Authentication e por organização.
- Todas as consultas administrativas são isoladas por organização.
- Emissão pública exige o e-mail cadastrado no evento.
- Sessão pública curta em cookie `HttpOnly`.
- Certificados usam códigos aleatórios longos; PDF privado exige sessão válida.
- Validação pública não expõe e-mail, ingresso ou listas de participantes.
- Tentativas, emissões, downloads, alterações e revogações ficam auditáveis.

O envio transacional por e-mail ficou fora desta primeira versão. O código do ingresso é o segundo fator operacional do fluxo público.
