# Verificação visual do painel de controle

Data da verificação: 26 de agosto de 2026.

A página principal foi revisada em viewport desktop de 1280 × 720. O painel apresenta os hubs padrão Marília e Ribeirão Preto, CRUD de hubs, mínimos individuais, pesos auditáveis e a seção de faixas avançadas. Os campos, rótulos e ações permanecem legíveis, sem sobreposição perceptível no layout capturado.

Também foi confirmado visualmente que os hubs padrão permanecem disponíveis no painel e que a explicação do desempate por menor distância está presente junto aos controles de roteamento.

## Verificação de produção

Após o envio do commit `39338ac` ao GitHub, o domínio Netlify ainda exibiu a versão anterior durante duas consultas consecutivas. O repositório remoto está atualizado; o deploy automático do Netlify pode requerer alguns minutos adicionais para concluir.

## Reorganização das telas

Em 26 de agosto de 2026, a reorganização foi verificada em desktop e em viewport mobile de 390 × 844. A tela inicial contém exclusivamente a consulta individual/em lote e a geração de relatório após a análise. Hubs, pesos e limites estão na rota `/configuracoes`, com ações de salvar diretas no topo e no rodapé.

A navegação foi validada interativamente: o botão **Configurações** abriu a rota administrativa e o botão **Voltar à consulta** retornou à tela principal. No mobile, o campo de CNPJ foi ajustado para exibir o botão de busca em uma linha própria, sem cortar o controle.
