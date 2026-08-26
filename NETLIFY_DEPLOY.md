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

## 3. Variável segura do CNPJá

No Netlify, abra **Project configuration** → **Environment variables** e adicione:

| Nome | Valor | Escopo |
|---|---|---|
| `CNPJA_API_KEY` | Chave comercial do CNPJá | Functions |

Sem essa variável, a aplicação utiliza o endpoint público do CNPJá, sujeito ao limite público de consultas. A chave nunca deve ser colocada em arquivos de frontend ou em variáveis com prefixo `VITE_`.

## 4. Publicação

Confirme o primeiro deploy. O Netlify publicará o frontend e as funções `/api/lookup`, `/api/analyze` e `/api/report`. Os próximos `git push` na branch `main` geram novas publicações automaticamente.

## Referências oficiais

- [Vite no Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Primeira Netlify Function](https://docs.netlify.com/build/functions/get-started/)
- [Variáveis de ambiente em Functions](https://docs.netlify.com/build/functions/environment-variables/)
