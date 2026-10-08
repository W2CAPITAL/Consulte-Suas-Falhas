# Consulte Suas Falhas

Consulta centralizada por escritório e advogado. O visitante **não importa arquivos** e o aplicativo **não possui login ou senha próprios**.

O backend utiliza Cloudflare D1. `/api/summary` publica apenas totais; processos e mensagens completos exigem autorização externa via Cloudflare Access porque incluem dados pessoais e conversas privadas.

O banco precisa receber uma **sincronização única** de `processos_1811.json` e `mensagens_20973.json`, fora do GitHub. Depois disso, todos os dispositivos consultam automaticamente a mesma carteira. Nenhum arquivo privado deve ser colocado no repositório público.

Cloudflare Worker: `consulte-suas-falhas`; banco: `consulte-suas-falhas-d1`. Configurar `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` e `USER_SCOPES_JSON` após habilitar Cloudflare Access.

O sistema não afirma que referências genéricas a NUMOPEDE sejam ofícios comprovados ou que apontamentos internos constituam culpa definitiva.

© 2026 W1 Soluções Capitais — por Davi Alves.
