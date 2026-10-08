# Consulte Suas Falhas — W1 Soluções Capitais

Plataforma de auditoria jurídica em Cloudflare Workers + D1, com menu **escritório → advogado → processos / mensagens**.

## Acesso ao aplicativo

- Login próprio habilitado por padrão (não depende do Cloudflare Access).
- Usuário inicial: **Auditoria**. A senha inicial foi definida pelo proprietário separadamente e **não é publicada no repositório**.
- Senha armazenada usando PBKDF2-SHA256 e sal, 310.000 iterações. Sessões com cookie HttpOnly, Secure e SameSite=Strict, validade de 8 horas.
- Bloqueio de tentativas repetidas por 15 minutos após cinco erros.
- **Configurações → Segurança → “Desabilite aqui”** oferece ON/OFF persistente no Cloudflare D1.
- **ON:** login necessário para todos os painéis de dados.
- **OFF:** a página pública apresenta somente indicadores agregados. **Nomes dos clientes, processos individualizados e mensagens continuam protegidos**; a conta Auditoria ainda pode entrar.
- Alteração de senha exige sessão autenticada, senha atual e nova senha com no mínimo 12 caracteres. Encerra todas as sessões após a alteração.

## Carteira integrada

As tabelas `processes`, `messages` e `message_case_links` usam o banco D1 `consulte-suas-falhas-d1`. A carteira é sincronizada no **servidor**; não há importação manual por visitante. Até a sincronização completa, o aplicativo deve exibir a quantidade real existente no D1.

`src/worker.js`: rotas privadas de consulta.  
`src/auth.js`: autenticação e configurações do login.  
`src/page.js`: interface.  
`src/ui.js`: navegação e formulários.

## Desenvolvimento e implantação

```bash
npm install
npm run check
npm run deploy
```

O `wrangler.toml` aponta para o projeto Cloudflare existente e o banco D1 existente. O ambiente pode precisar de autenticação no Wrangler para o deploy; o GitHub não recebe segredos da Cloudflare.

## Proteção e limites

Este repositório não armazena processos, PDFs, mensagens ou cópias dos arquivos de clientes. O modo público não concede acesso a esses dados.

As atribuições de erros na auditoria não são conclusão de culpa jurídica; referências ao NUMOPEDE/OAB não são equivalentes a sanções sem comprovação específica.

© 2026 W1 Soluções Capitais — por Davi Alves. Todos os direitos reservados.
