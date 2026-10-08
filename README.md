# Consulte Suas Falhas — W1 Soluções Capitais

Portal de consulta de auditoria por **escritório → advogado → forma de consulta**. Sem conta, login, senha ou administrador.

## Como funciona
A interface é publicada livremente no Cloudflare Workers. A carteira real e as mensagens dos clientes **não são disponibilizadas por uma API pública**, porque contêm informações pessoais e conversas privadas. Para consultar os dados, cada leitor autorizado carrega os arquivos `processos_1811.json` e `mensagens_20973.json` **no próprio navegador**. Os dados ficam preservados somente naquele aparelho, por IndexedDB, até serem apagados.

Seletores: GM, HUGS, JVA, todos, vínculo a confirmar. As mensagens com Bruna pertencem ao contexto **JVA**. O vínculo de muitos processos ainda está identificado como **VINCULO A CONFIRMAR**, e não deve ser atribuído por hipótese.

Modos: resumo rápido, todos os processos, todas as mensagens (inclusive sem CNJ), erros individualizados, ranking de atribuições, menções NUMOPEDE/OAB, PDF (impressão e arquivos locais) e reprodução de vídeo local.

Nenhuma ocorrência de NUMOPEDE deve ser interpretada como denúncia, ofício expedido ou punição sem prova específica. As atribuições da planilha não equivalem a culpa profissional judicialmente reconhecida.

## Deploy
```bash
npm install
npx wrangler deploy
```
Os módulos de Worker são `src/worker.js`, `src/page.js` e `src/ui.js`. Não são necessários bindings D1, R2, variáveis ou secrets. Os bancos D1 de testes anteriores não são utilizados neste modo.

**Atenção:** qualquer pessoa que tiver uma cópia dos JSONs poderá abrir a carteira no próprio navegador. Não envie esses arquivos para um repositório público. Em aparelhos compartilhados, clique em **Apagar deste aparelho**.

© 2026 W1 Soluções Capitais — por Davi Alves. Todos os direitos reservados.
