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

No site publicado, o painel salva hubs, pesos e limites no **Netlify Blobs**, o armazenamento nativo de chave-valor do Netlify. Não é necessário configurar `DATABASE_URL` ou `CONTROL_PANEL_TOKEN` para gravar as configurações: o armazenamento é provisionado automaticamente pelo Netlify e permanece disponível entre deploys.

> O painel foi configurado para acesso direto, sem senha, conforme solicitado. Assim, qualquer pessoa que tenha acesso à página `/configuracoes` pode alterar os critérios comerciais. Para voltar a restringir o acesso no futuro, habilite autenticação e uma regra de autorização antes de divulgar o endereço.

## 5. Processamento em lote manual

O processamento em lote aceita até **500 CNPJs**. A lista é automaticamente dividida em grupos de **até cinco CNPJs**; para respeitar a API Pública do CNPJá, há uma espera de **15 segundos** entre as consultas de cada grupo.

Depois que um grupo termina, o usuário deve clicar em **Pesquisar próximo grupo** para iniciar o seguinte. Assim, o lote não depende de execução contínua, extensões do Netlify ou créditos adicionais. Os resultados ficam acumulados na tela.

Ao concluir, a aplicação exibe uma tabela resumida com CNPJ, empresa, localização, situação, score, canal, hub e distância. O botão **Baixar tabela CSV (Excel)** gera um arquivo compatível com Excel. Para consulta individual, o PDF detalhado continua disponível.

## 6. Publicação

Confirme o primeiro deploy. O Netlify publicará o frontend e as funções `/api/lookup`, `/api/analyze`, `/api/report` e `/api/control`. Os próximos `git push` na branch `main` geram novas publicações automaticamente.

## Referências oficiais

- [Vite no Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/)
- [Primeira Netlify Function](https://docs.netlify.com/build/functions/get-started/)
- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
