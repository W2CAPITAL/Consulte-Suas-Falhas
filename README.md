# Consulte Suas Falhas — Gabinete de Auditoria

CRM jurídico **de consulta**, com seleção visual **escritório → advogado → processo → erros e providências**. O projeto é preparado para Cloudflare Workers e armazenamento privado.

## Estado do deploy
O primeiro deploy publica **somente a interface vazia**. Nenhum cliente, conversa, PDF, planilha ou número de processo real é publicado no GitHub ou no frontend. A API nega acesso por padrão enquanto não houver autenticação Cloudflare Access com assinatura JWT verificada e escopos por usuário.

### Antes de liberar a carteira
1. No Cloudflare, habilite **Zero Trust / Access** e proteja o domínio do Worker por e-mail autorizado.
2. Habilite **R2**, crie um bucket privado `consulte-falhas-private`.
3. Descomente o binding `AUDIT_DATA` em `wrangler.toml` e execute `wrangler deploy`.
4. Em Worker secrets configure `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` e `USER_SCOPES_JSON`. Exemplo de permissão:
```json
{"gestor@exemplo.com":{"role":"admin"},"advogado@exemplo.com":{"role":"viewer","companies":["JVA"],"lawyers":["MATHEUS"]}}
```
5. Execute `node scripts/prepare-data.mjs /caminho/para/_numoped_master1811.json` e `wrangler r2 object put consulte-falhas-private/audit.json --file private/audit.json --remote`.
6. Consulte `/api/health`: `accessConfigured` e `dataConfigured` devem ser `true`.

## Segurança
- Repositório público contém **somente código**.
- O endpoint `/api/cases` e seus detalhes exigem identidade verificada por chave pública do Cloudflare Access e permissão explícita por e-mail, escritório e advogado.
- Vínculos JVA/GM indefinidos aparecem como **VÍNCULO A CONFIRMAR**, não atribuídos arbitrariamente.
- Registro interno de erro não equivale a culpa jurídica comprovada. Referência ao NUMOPEDE não equivale a ofício expedido ou condenação disciplinar.
- API somente leitura, sem escrita ou edição de dados.
- Para auditorias com dados pessoais siga LGPD, princípio da necessidade e restrição de acesso.

## Desenvolvimento
```bash
npm install
npm run check
npm run deploy
```

*Conexões adicionais (DataJud, DJEN, scanner NUMOPEDE, PDFs privados, SheetsPredict/LexisPredict) requerem configuração separada e validação das fontes; não estão representadas como integrações funcionais nesta versão.*
