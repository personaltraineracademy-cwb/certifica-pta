# Auditoria do sistema — 27/09/2026

## Escopo verificado

- Autenticação administrativa e isolamento por organização.
- Criação, edição, importação e publicação de eventos.
- Emissão, download, validação e revogação de certificados.
- Firestore, Firebase Storage e dados migrados do Neon.
- Interface administrativa e jornada pública, com prioridade para celular.

## Corrigido nesta auditoria

- Menu completo no painel para telas pequenas.
- Jornada de emissão dividida visualmente em três etapas.
- Botões e campos com áreas de toque maiores e estados de carregamento claros.
- Transições de página, cartões, abas e controles com movimento curto e consistente.
- Respeito automático à preferência de redução de movimento do aparelho.
- Navegação de login e logout sem recarregar toda a aplicação.
- Limitação de tentativas vinculada ao e-mail e ao contexto da solicitação, reduzindo bloqueios indevidos.
- Documentação atualizada para Firebase Authentication, Firestore e Storage.

## Estado das funcionalidades

| Fluxo | Estado | Observação |
| --- | --- | --- |
| Login administrativo | OK | Firebase Authentication e cookie seguro no servidor. |
| Eventos | OK | Criação, edição, exclusão e publicação auditadas. |
| Participantes | OK | Inclusão manual e importação CSV/XLSX. |
| Template | OK | Imagem privada no Firebase Storage. |
| Emissão | OK | Busca por evento, confirmação do nome e PDF. |
| Validação | OK | Código público sem exposição do e-mail. |
| Relatórios | OK | Exportação CSV por evento. |

## Banco de dados

O runtime usa somente Firebase. As leituras públicas são filtradas por evento e os arquivos ficam privados no Storage. A área administrativa ainda agrega algumas telas lendo coleções completas e filtrando por organização no servidor. Isso mantém o isolamento funcional, mas aumenta custo e latência com o crescimento da base.

### Próximas melhorias recomendadas

1. Criar documentos agregados por organização e evento para contadores do painel.
2. Paginar participantes e certificados com cursores do Firestore.
3. Adicionar expiração automática (TTL) para `access_attempts` e `access_sessions`.
4. Tornar a emissão idempotente com uma transação ou trava por inscrição para impedir duplicidade em requisições simultâneas.
5. Remover os artefatos históricos do Drizzle/Neon depois de guardar uma cópia externa da migração.

## Interface e acessibilidade

- O layout parte de telas pequenas e cresce para desktop.
- A navegação móvel está disponível no cabeçalho.
- A página de emissão apresenta uma única decisão principal por etapa.
- Foco, contraste e feedback de carregamento permanecem visíveis.
- Animações são discretas e desativadas quando o sistema solicita movimento reduzido.
