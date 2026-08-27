# Verificação visual do processamento em lote

Em 27 de agosto de 2026, a aba **Importar em lote** foi verificada no navegador em viewport desktop. A tela apresenta a lista de CNPJs, o indicador “Até 500 CNPJs · grupos de 5 · 15 s entre consultas”, o botão de importação e o botão de pesquisa manual. A nova orientação informa que cada clique consulta no máximo cinco CNPJs e que o grupo seguinte só é iniciado pelo botão **Pesquisar próximo grupo**.

Os controles principais permanecem legíveis e a tela inicial preserva o acesso à página de Configurações. Com a lista vazia, o botão é mostrado como “Informe os CNPJs”, evitando sugerir que há um lote concluído.

Após recarregar a página e abrir a aba de lote, confirmou-se que o botão permanece desabilitado até o preenchimento da lista e que o texto “Informe os CNPJs” é exibido. A interface comunica de modo explícito que os resultados serão acumulados e que cada grupo subsequente depende de novo clique do usuário.

Também foi iniciado um grupo manual com um CNPJ público de teste. Durante a execução, o botão passou a indicar “Pesquisando 1 de 1…”, foi bloqueado contra novos cliques e o cartão de progresso mostrou a consulta em andamento. Nenhum grupo adicional é disparado automaticamente.

O grupo de teste foi concluído com uma análise bem-sucedida. A página exibiu a tabela resumida com identificação, empresa, localização, situação, score, canal, hub e distância; o botão **Baixar tabela CSV (Excel)** confirmou o download de um arquivo compatível com Excel.

Para validar a progressão, foi preparada uma lista com seis itens. A interface separou corretamente o primeiro grupo em cinco itens, exibiu “Pesquisar primeiro grupo (5)” e, após o clique, travou o botão enquanto indicava “Pesquisando 1 de 6…”.

Depois da conclusão do primeiro grupo, o progresso permaneceu em **5 de 6** e o botão mudou para **Pesquisar próximo grupo (1)**, sem iniciar a consulta final automaticamente. O sexto item só passou a “Pesquisando 6 de 6…” após novo clique explícito, comprovando o avanço manual entre os grupos.

Ao finalizar o segundo grupo, o cartão exibiu **6 de 6**, 100% processado e o total acumulado de cinco falhas. A tabela resumida preservou a análise bem-sucedida do primeiro grupo, comprovando que resultados e erros são acumulados até o fim do lote.

## Medição da cadência

O primeiro grupo continha cinco consultas. Após seu início, foi aguardado um intervalo de **65 segundos** antes da conferência da tela; nesse momento, as cinco consultas já estavam concluídas. Como o fluxo aplica quatro esperas entre cinco itens, a duração mínima esperada é **4 × 15 s = 60 s**, acrescida do tempo de resposta da API. A observação confirma a cadência de 15 segundos implementada entre as consultas do grupo.
