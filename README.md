# Consulte Suas Falhas

Plataforma privada de auditoria documental e revisão jurídica, com interface inspirada em menus de seleção de jogos: **escritório → advogado → área de análise**. Interface responsiva e tema noturno azul-marinho/dourado.

## Aplicação

**Cloudflare Workers + D1** — interface, API, login e dados em um único Worker.

**Produção:** https://consulte-suas-falhas.corporacaow1capital.workers.dev/

O repositório guarda **somente código**. Dados pessoais, mensagens, documentos originais, senhas e tokens não devem ser adicionados ao GitHub.

## Áreas funcionais

| Área | Função |
| --- | --- |
| Central de comando | Indicadores da carteira disponível, processos com apontamentos e progresso de mensagens. |
| Arquivo de processos | Busca por número CNJ, cliente e material da auditoria; evidências e providências do registro. |
| Sala de evidências | Pesquisa autorizada nas mensagens sincronizadas; leitura individual. |
| Ranking de auditoria | Apontamentos atribuídos por advogado, com ressalva expressa de que **não é julgamento de culpa**. |
| Scanner NUMOPEDE | Processos candidatos à verificação judicial, sem apresentar candidato como ofício comprovado. |
| Biblioteca de dossiês | Geração de relatórios HTML imprimíveis (Ctrl+P → PDF) com filtro e autorização no servidor; upload/visualização privada de PDFs originais. |
| Central de vídeos | Apresentação guiada em cenas e importação/reprodução privada de MP4. |
| Minha análise | Revisar um processo, reconhecer, contestar ou informar a correção do apontamento; mantém prova original e histórico separado. |

O dossiê gerado pela aplicação é **dinâmico**, baseado nos dados atuais do D1. Ele não substitui os PDFs periciais originais, que só aparecerão na biblioteca depois de importados.

## Importar os dossiês e os vídeos sem expor os dados

1. Entre com uma conta administradora no aplicativo.
2. Selecione **Todos os escritórios → Todos os advogados → Biblioteca de dossiês**.
3. Descompacte o ZIP dos 12 PDFs em seu computador. Clique em **Selecionar pasta inteira** ou escolha vários arquivos PDF no campo principal.
4. Clique em **Enviar arquivos privados** e aguarde o indicador atingir 100%. Não feche a aba durante o envio.
5. Para os arquivos MP4, abra **Central de vídeos** e faça o mesmo procedimento.
6. Os originais ficam em tabelas privadas do **Cloudflare D1**, são transmitidos com cookie de sessão e não entram no GitHub público. O acesso aos originais é administrativo, pois os arquivos podem misturar dados de diferentes carteiras.

**Limites de importação:** até 60 MiB por arquivo. Os envios são divididos em blocos de 48 KiB e armazenados de forma incremental. Para arquivos muito grandes ou utilização intensa, o armazenamento R2 é tecnicamente mais adequado, mas não está habilitado nessa conta. O D1 não deve ser tratado como um serviço de streaming de alto tráfego.

## Acesso e integridade

- Login próprio, com cookies HttpOnly + Secure + SameSite=Strict.
- Senhas protegidas por PBKDF2-SHA256; prova de login por desafio.
- Permissões por empresa e profissional, conferidas nas consultas ao banco, inclusive no acesso direto por URL e na geração de relatórios.
- Somente o administrador cria contas em **Configurações**, definindo empresa e advogado.
- Nenhuma anotação individual altera o registro original da auditoria.
- Não há acesso público a dados individualizados, PDFs privados ou vídeos privados.
- Menções a NUMOPEDE devem preservar os níveis **candidato**, **determinação encontrada** e **ofício comprovadamente expedido/recebido**. A base de candidatos não prova sanção.

## Progresso da carteira

No último levantamento do D1, a base continha 1.811 registros de processos, 4.623 mensagens sincronizadas de um universo documental de 20.973 e 125 candidatos NUMOPEDE. Esses números são observações do estado do banco, não garantias de sincronização definitiva. A interface exibe o total corrente.

As integrações LexisPredict, SheetsPredict, PredictLM e WA.Auto não foram conectadas neste pacote. Não há consulta automática em tempo real a autos externos por essa interface.

## Desenvolvimento

```bash
npm install
npm run check
node tests/smoke.mjs
npm run deploy
```

Os testes de CI verificam sintaxe, mecanismos de login, acesso restrito e inicialização real do Worker em ambiente local. O deploy produtivo é verificado separadamente no Cloudflare.

**Licenciamento:** todos os direitos reservados, salvo concessão explícita pelo mantenedor. Não redistribua informações processuais privadas.
