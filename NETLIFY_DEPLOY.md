# Publicação com GitHub e Netlify

## 1. Repositório GitHub

Crie um novo repositório vazio chamado `cnpj-score-relatorio` no GitHub. Não selecione README, `.gitignore` ou licença durante a criação, pois o projeto já possui esses arquivos.

Depois de criar o repositório, use o endereço HTTPS fornecido pelo GitHub para conectar o repositório local:

```bash
git remote add origin https://github.com/SEU_USUARIO/cnpj-score-relatorio.git
git branch -M main
git push -u origin main
```

## 2. Projeto no Netlify

No Netlify, selecione **Add new project** → **Import an existing project** → **GitHub**. Autorize o acesso ao repositório e escolha `cnpj-score-relatorio`.

O arquivo `netlify.toml` já define os parâmetros necessários:

| Campo | Valor |
|---|---|
| Build command | `pnpm exec vite build` |
| Publish directory | `dist/public` |
| Functions directory | `netlify/functions` |
| Versão Node | `22` |

## 3. API Pública do CNPJá

Não é necessário configurar chave, token ou variável de ambiente. A aplicação consulta diretamente o endpoint público `GET https://open.cnpja.com/office/:cnpj`, sempre com o CNPJ sem pontuação.

> A API Pública possui limite de **5 consultas por minuto por endereço IP**. Por isso, mantenha lotes pequenos e evite consultas simultâneas. Os dados públicos podem ter defasagem em relação às fontes originais.

## 4. Painel de controle persistente

O painel de hubs e pesos grava dados nas tabelas `sales_hubs` e `scoring_parameters`. Para manter as alterações no site publicado, configure em **Site configuration → Environment variables**:

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | String de conexão MySQL/TiDB que contém as migrações do painel. Use SSL se o provedor exigir. |
| `CONTROL_PANEL_TOKEN` | Chave forte para autorizar alterações administrativas em `/api/control`. Informe a mesma chave no campo administrativo do painel somente enquanto for editar. |

Sem `DATABASE_URL`, a aplicação mostra valores seguros de fábrica, mas não grava alterações no ambiente publicado. Sem `CONTROL_PANEL_TOKEN`, o endpoint de alteração fica bloqueado por segurança. Nunca inclua esses valores no repositório ou no frontend.

## 5. Publicação

Confirme o primeiro deploy. O Netlify publicará o frontend e as funções `/api/lookup`, `/api/analyze` e `/api/report`. Os próximos `git push` na branch `main` geram novas publicações automaticamente.

## Referências oficiais

- [Vite no Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Primeira Netlify Function](https://docs.netlify.com/build/functions/get-started/)
- [Variáveis de ambiente em Functions](https://docs.netlify.com/build/functions/environment-variables/)
