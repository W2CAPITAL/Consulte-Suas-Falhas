# Consulte Suas Falhas

Gabinete jurídico privado de auditoria processual com seletor de **escritório → advogado** e duas abas exclusivas: **Todos os Processos** e **Todas as Mensagens**.

## Cloudflare
- Worker: `consulte-suas-falhas`
- Banco privado D1: `consulte-suas-falhas-d1`
- Autenticação própria: PBKDF2-SHA256, sessões protegidas em cookie HttpOnly+Secure+SameSite=Strict, limite de tentativas, CSRF por Origin.
- Nenhum processo, mensagem, CPF, planilha ou PDF é enviado a este repositório público.

## Inicialização
1. Cloudflare Worker → Configurações → Variables and Secrets → criar secret `SETUP_TOKEN` (valor aleatório de pelo menos 32 caracteres).
2. Abrir o Worker e definir primeiro usuário e senha (mínimo 16 caracteres) usando esse token.
3. Baixar os arquivos `processos_1811.json` e `mensagens_20973.json` disponibilizados separadamente, fora do GitHub.
4. Após login, abrir **Importar carteira completa** e enviar os dois arquivos. O envio é parcelado e pode ser repetido sem duplicar.
5. Ao fim, a aba **Todos os Processos** terá 1.811 linhas históricas e **Todas as Mensagens** terá 20.973 registros quando a importação estiver completa.

## Regras de auditoria
- Bruna Solla pertence ao contexto JVA, apesar do nome original do arquivo.
- Os registros sem escritório individual comprovado ficam em **VINCULO A CONFIRMAR**; não confundir JVA/GM ou HUGS assumido por GM.
- Das 20.973 mensagens, muitas não contêm CNJ e ficam acessíveis na consulta **Todas as conversas autorizadas**, sem vinculação artificial.
- No detalhe do processo são preservados os erros individualizados da fonte anterior, providências, evidências e anotações.
- A pesquisa no Diário/DJEN pode ser aberta por processo, porém não significa que o scanner NUMOPEDE tenha concluído consulta pública.
- As credenciais nunca devem ser inseridas no GitHub ou em planilhas.

## Escopo desta versão
Consulta e importação privada implementadas. Não inclui integração automática ativa com DataJud ou WA.Auto e não transforma atributos internos de erro em conclusão de culpa profissional.
