# Verificação visual do processamento em lote

Em 27 de agosto de 2026, a aba **Importar em lote** foi verificada no navegador em viewport desktop. A tela apresenta a lista de CNPJs, o indicador “Até 500 CNPJs · grupos de 5 · 15 s entre consultas”, o botão de importação e o botão de início da pesquisa.

Os controles principais permanecem legíveis e a tela inicial preserva o acesso à página de Configurações. Com a lista vazia, o botão é mostrado como “Informe os CNPJs”, evitando sugerir que há um lote concluído.

Após recarregar a página e abrir a aba de lote, confirmou-se que o botão permanece desabilitado até o preenchimento da lista e que o texto “Informe os CNPJs” é exibido. A interface comunica de modo explícito que os resultados serão acumulados.

Também foi iniciado um grupo de teste com um CNPJ público. Durante a execução, o botão passou a indicar “Pesquisando 1 de 1…”, foi bloqueado contra novos cliques e o cartão de progresso mostrou a consulta em andamento.

O grupo de teste foi concluído com uma análise bem-sucedida. A página exibiu a tabela resumida com identificação, empresa, localização, situação, score, canal, hub e distância; o botão **Baixar tabela CSV (Excel)** confirmou o download de um arquivo compatível com Excel.

Para validar o particionamento, foi preparada uma lista com seis itens. A interface separou corretamente o primeiro grupo em cinco itens, exibiu “Pesquisar primeiro grupo (5)” e, após o clique, travou o botão enquanto indicava “Pesquisando 1 de 6…”.

Na versão atual, ao terminar um grupo que não seja o último, a interface exibe a contagem **“Próximo grupo em 2 s”** e inicia a próxima sequência automaticamente quando chega a zero. Durante essa contagem, o botão principal fica bloqueado e é exibida a ação **“Cancelar avanço automático”**, que interrompe somente o próximo disparo e preserva os resultados já obtidos.

Ao finalizar o último grupo, o cartão exibe **6 de 6**, 100% processado e o total acumulado de falhas. A tabela resumida preserva os resultados obtidos nos grupos anteriores, permitindo baixar o CSV consolidado a qualquer momento.

## Validação da continuidade automática

O temporizador de dois segundos foi coberto com relógio controlado em teste automatizado. A cobertura confirma a sequência **2 → 1 → 0**, um único disparo de conclusão e a interrupção segura quando o usuário seleciona **Cancelar avanço automático**. A divisão de uma lista de 500 CNPJs também é validada até o último grupo, impedindo que uma entrada acima desse limite seja encaminhada à consulta.

> O encadeamento ocorre exclusivamente no navegador e depende de a aba permanecer aberta. Não há fila em segundo plano, execução contínua hospedada ou extensão paga.

## Execução prática em dois grupos

Após a implementação da continuidade automática, foi executado no navegador um lote local com seis CNPJs sintéticos inválidos, exclusivamente para verificar o controle de fluxo sem consultar cadastros comerciais reais. Os cinco primeiros itens foram processados sequencialmente, com as quatro pausas de 15 segundos. Ao término do primeiro grupo, a notificação informou que o próximo começaria em dois segundos; o sexto item foi então iniciado sem um segundo clique.

O processamento encerrou em **6 de 6**, com seis falhas esperadas devido aos identificadores sintéticos. Esse resultado comprova que o avanço automático preserva a ordem, acumula falhas e alcança o último grupo. O teste unitário do temporizador também confirma que a ação **Cancelar avanço automático** interrompe o disparo programado antes de qualquer nova consulta. A exportação CSV continua coberta pela validação anterior com um CNPJ público de teste que gerou uma linha de relatório.

## Medição da cadência

O primeiro grupo continha cinco consultas. Após seu início, foi aguardado um intervalo de **65 segundos** antes da conferência da tela; nesse momento, as cinco consultas já estavam concluídas. Como o fluxo aplica quatro esperas entre cinco itens, a duração mínima esperada é **4 × 15 s = 60 s**, acrescida do tempo de resposta da API. A observação confirma a cadência de 15 segundos implementada entre as consultas do grupo.
