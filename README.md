# Consulte Suas Falhas · CRM de auditoria processual

**Produção:** https://consulte-suas-falhas.corporacaow1capital.workers.dev/

Aplicativo de auditoria documental com interface inspirada nos painéis de referência fornecidos: menu lateral fixo azul-marinho, cabeçalho escuro, conteúdo em cartões claros, tabelas, gráficos, destaque de risco e leitor HTML integrado. Construído em **Cloudflare Workers + D1**.

## Navegação sem etapa intermediária

Ao entrar, a tela inicial abre o resumo executivo. Clicar uma única vez em uma aba do menu carrega imediatamente seus dados, sem menus secundários obrigatórios:

| Aba | Conteúdo aberto automaticamente |
| --- | --- |
| Início / Resumo Executivo | Indicadores do D1, distribuição por escritório e profissional, resumo HTML original. |
| Escritórios | GM, HUGS e JVA; processos do escritório e **dossiê HTML original** na mesma página. |
| Advogados | Ranking/seleção dos sete profissionais; processos e **dossiê individual HTML** já carregados. |
| Todos os Processos | Tabela de processos da carteira, pesquisa e ficha detalhada do primeiro registro. |
| Todas as Mensagens | Mensagens sincronizadas, pesquisa e primeira conversa expandida. |
| Erros Individualizados | Processos com erros documentados e evidências individualizadas. |
| Dossiês em HTML | Lista autorizada dos doze documentos e leitura automática integral por páginas. |
| NUMOPEDE / OAB | Lista de candidatos ao scanner, CNJ, cliente e detalhes. |
| Relatórios | Indicadores reais, gráficos e dossiê geral em HTML. |
| Vídeos e Imagens | Dois MP4 originais com áudio, capas extraídas dos vídeos e galeria dos 12 dossiês. |
| Configurações | Perfil, permissões, contas individuais autorizadas e encerramento de sessão. |

## Arquivos HTML já importados

A base D1 contém **12 dossiês, totalizando 411 páginas importadas, completas e paginadas**:

- Resumo Executivo Geral — 14 páginas.
- GM — 37 páginas.
- HUGS — 9 páginas.
- JVA — 86 páginas.
- Matheus — 83 páginas.
- Andressa — 52 páginas.
- Eraldo — 44 páginas.
- Maikon — 26 páginas.
- Gilberto — 25 páginas.
- Isai — 19 páginas.
- Fábio — 11 páginas.
- Danilo — 5 páginas.

O dossiê do Danilo também aparece automaticamente na ficha do processo **5000628-05.2025.8.13.0481** para a conta administradora. Cada documento possui uma rota privada permanente em `/html/<identificador>`, com leitura direta em HTML e controle de sessão. Os mesmos textos são consultáveis dentro das abas sem abrir outro arquivo.

**Fidelidade visual:** as 411 páginas também possuem uma versão vetorial em SVG, com gráficos, tabelas, cores e posições provenientes dos PDFs originais. Os glifos são convertidos em curvas para dispensar fontes instaladas no dispositivo. A transcrição textual permanece disponível em cada página. As imagens carregam conforme entram na área de leitura; o documento inteiro abre automaticamente. Os PDFs e os lotes privados de importação não são publicados no GitHub.

### Acesso e segurança

Os documentos são confidenciais. A leitura integral requer sessão válida. Cada advogado tem acesso somente aos próprios dossiês individuais e aos dados autorizados por escopo; os dossiês gerais, completos por escritório e do Danilo permanecem restritos ao administrador, pois podem incluir informações de outras pessoas. A listagem de documentos é filtrada no servidor, e URLs diretas não contornam as permissões.

A criação de usuários também é feita pelo administrador no aplicativo. Acesso público não habilita consulta a processos, clientes, mensagens ou documentos privados.

## Integridade das métricas

Os números exibidos na interface vêm do D1 atual: **1.811 registros de processos, 4.623 mensagens importadas e 125 candidatos NUMOPEDE** no último levantamento. São diferentes do universo documental dos PDFs originais, que informam **1.791 processos auditados, 1.041 erros individuais e 6.924 mensagens de cobrança**. Esses dados não são somados nem apresentados como uma única amostra.

**NUMOPEDE:** registro candidato não equivale a expedição de ofício ou punição. **Ranking:** vínculo de profissional e contagem de falhas não equivalem a culpa jurídica definitiva. A atribuição administrativa dos escritórios segue a política documentada abaixo.

## Desenvolvimento

```bash
npm install
npm run check
node tests/smoke.mjs
npm run deploy
```

O CI confere scripts, testa as permissões das páginas vetoriais e inicia um Worker real para testar rotas públicas/privadas. O deploy foi feito por API no Cloudflare, preservando a conexão D1. As versões finais das páginas estão no D1, não no código-fonte do GitHub.

Integrações LexisPredict, SheetsPredict, PredictLM e WA.Auto não fazem parte deste deploy. O site não deve prometer consulta de autos em tempo real sem uma integração efetivamente ativa.

## Atualização 2.2

- Busca global preserva o termo digitado e permite buscar com Enter.
- Abrir um registro por escritório ou advogado mantém o processo selecionado.
- Filtros de escritório e profissional aparecem na carteira; trocar filtros reinicia a paginação.
- Navegação cancela solicitações da aba anterior e impede que uma resposta atrasada substitua a ficha escolhida.
- Resumo Executivo e Início carregam o resumo completo automaticamente.
- O gráfico de processos com apontamentos calcula a proporção a partir dos dados do recorte.
- Títulos, menu e cartões usam o padrão visual das referências enviadas.

### Importação das páginas visuais

Aplicar `migrations/0001-dossier-visuals.sql` à mesma base D1 antes de publicar esta versão. A produção já recebeu a migração e as 411 páginas. Para reproduzir a conversão em uma instalação própria:

```bash
python3 scripts/prepare-dossier-visuals.py /diretorio/privado/pdfs /diretorio/privado/danilo.pdf /diretorio/privado/lotes
```

O script verifica a quantidade de páginas de cada um dos 12 documentos e gera lotes parametrizados para a API D1. O arquivo de Danilo deve ser a versão forense de 5 páginas usada na base, não a versão de 26 páginas contida no ZIP. Os lotes contêm documentos confidenciais e devem permanecer fora do repositório. Cada página é armazenada comprimida, vinculada ao hash SHA-256 do PDF de origem e servida em `/html/<identificador>/page/<numero>.svg` com a mesma sessão e autorização do documento. A importação entra primeiro em `dossier_import_pages`. Após conferir os totais e hashes, um lote transacional por documento substitui `dossier_pages` e `dossier_visual_pages` e atualiza os totais em `dossier_docs`. Aplicar também a migração 0002 uma única vez para o estágio e os metadados de mídia.


## Atualização 2.3

Os PDFs mais recentes fornecidos pelo titular substituem as versões anteriores: 12 documentos e 411 páginas, com a diagramação original. Os dois vídeos são os MP4 enviados, sem transcodificação, com áudio, duração, capa e suporte a reprodução e busca por intervalos de bytes. A política de conteúdo permite mídia da própria aplicação; GET, HEAD e Range preservam os bytes originais e exigem acesso administrativo.

### Classificação administrativa da carteira

Os 1.555 registros anteriormente sem escritório recebem uma classificação de carteira. Vínculos existentes são preservados. As listas de processos dos dossiês GM, JVA e HUGS fornecem evidência por CNJ, importada em `office_document_links`, sem publicar documentos privados. Uma correspondência exclusiva define o escritório; em transferências, a origem histórica e a carteira recente seguem a regra temporal do titular.

Para registros sem correspondência exclusiva, os anos 2025–2026 representam a carteira recente GM; os anteriores ou sem ano válido ficam na carteira histórica **JVA / HUGS**. Essa é uma regra administrativa aproximada para a orientação de cerca de 18 meses, pois o cadastro contém o ano do CNJ, sem data completa de distribuição. Ela não declara a data de contratação nem autoria de atos. A categoria histórica funciona nos filtros e abre os dossiês JVA e HUGS. `office_assignment_audit` preserva o escritório anterior, o novo, o critério e a data fixa da política (08/10/2026), permitindo revisão sem perder a origem.

Para reproduzir a classificação, aplique a migração 0003, use `scripts/prepare-office-links.py` para gerar os vínculos das listas dos PDFs em diretório privado, importe esses lotes no D1 e execute `scripts/apply-office-policy.sql`. O script ignora as menções contextuais e cruza somente a seção de lista de processos.
