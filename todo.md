# Project TODO

- [x] Interface principal elegante para consulta comercial de CNPJs
- [x] Entrada individual de CNPJ com validação e máscara
- [x] Importação em lote por colagem de lista e arquivo CSV
- [x] Integração server-side com API do CNPJá
- [x] Armazenamento seguro da chave da API em variável de ambiente
- [x] Extração de dados cadastrais, CNAEs, endereço e capital social
- [x] Motor de pontuação determinístico sem uso de IA
- [x] Regras configuráveis de situação cadastral, porte, capital social, CNAE e critérios comerciais
- [x] Cálculo de distância entre cliente, Marília/SP e Ribeirão Preto/SP
- [x] Recomendação auditável entre Interno Online, Externo Marília e Externo Ribeirão Preto
- [x] Justificativa detalhada com fatores e pontuação por critério
- [x] Visualização de resultados individuais e em lote
- [x] Geração de relatório PDF individual e consolidado
- [x] Testes unitários do motor de pontuação e validação de CNPJ
- [x] Teste de fluxo de consulta individual e lote
- [x] Verificação visual desktop e mobile
- [x] Validação final de build e exportação PDF
- [x] Criar checkpoint final antes da entrega

- [x] Implementar máscara de CNPJ no campo individual e validação no cliente
- [x] Tornar as regras de scoring configuráveis por arquivo centralizado
- [x] Adicionar testes de fluxo individual e lote
- [x] Validar exportação PDF com teste automatizado

- [x] Centralizar também pesos de situação cadastral e categoria ICP no arquivo de regras
- [x] Cobrir com teste unitário a normalização da lista importada e a máscara de CNPJ

- [x] Preparar pacote de arquivos HTML, CSS e JavaScript para download

- [x] Avaliar e preparar a adaptação do backend para Netlify Functions
- [x] Criar configuração de build e variáveis de ambiente para Netlify
- [x] Orientar envio do projeto ao GitHub e conexão de deploy com Netlify

- [x] Remover o uso opcional de chave comercial e fixar a API Pública do CNPJá
- [x] Atualizar documentação de deploy para o limite de 5 consultas por minuto da API Pública
- [x] Limitar cada lote a cinco CNPJs para respeitar a API Pública

- [x] Atualizar a cópia da interface para remover referências à chave e à API Comercial
- [x] Exibir aviso quando a entrada em lote ultrapassar cinco CNPJs

- [x] Consultar o CNPJ individual e exibir os dados em formulário editável
- [x] Aplicar alterações confirmadas pelo usuário ao cálculo, justificativa e PDF
- [x] Testar o fluxo de revisão cadastral antes da análise

- [x] Testar procedure de busca cadastral antes da análise
- [x] Cobrir o bloqueio de análise individual sem confirmação dos dados revisados

- [x] Corrigir a cobertura de coordenadas para São José do Rio Pardo
- [x] Validar o cálculo de distância e roteamento para os dois hubs

- [x] Cadastrar hubs adicionais com nome, cidade, UF e coordenadas
- [x] Comparar dinamicamente todos os hubs cadastrados na análise
- [x] Exibir hubs adicionais na interface e no relatório PDF
- [x] Testar a recomendação com três ou mais hubs

- [x] Evitar duplicação do prefixo “Hub” no vendedor recomendado
- [x] Atualizar o teste de hubs adicionais com nomenclatura comercial limpa

- [x] Diagnosticar e corrigir a geração de relatório PDF no Netlify
- [x] Adicionar critério auditável de proximidade por DDD
- [x] Explicar no PDF a metodologia e os critérios de pontuação aplicados
- [x] Atualizar a interface para Análise Carteira Micro Automação Campinas
- [x] Adicionar rodapé Fernando Feitosa — Revisor

- [x] Criar persistência de hubs com Marília e Ribeirão Preto pré-configurados
- [x] Implementar CRUD de hubs no painel de controle
- [x] Implementar CRUD de pesos, índices e pontuação mínima de encaminhamento
- [x] Aplicar a menor distância como critério de desempate entre hubs elegíveis
- [x] Integrar regras persistidas à análise e ao relatório PDF
- [x] Testar o painel e a decisão configurável de roteamento
- [x] Mover a chave administrativa para o topo da navegação
- [x] Criar a rota e a tela separada de Configurações
- [x] Concentrar hubs, pesos, limiares e botão Salvar na tela de Configurações
- [x] Deixar a tela principal limitada à consulta de CNPJ e ao relatório PDF
- [x] Validar navegação, responsividade, testes e build após a reorganização
- [x] Validar em desktop e mobile as telas de consulta e Configurações
- [x] Testar a navegação real entre Consulta e Configurações
- [x] Permitir valores negativos nos pesos de pontuação configuráveis
- [x] Manter limiares comerciais e mínimos de hub sem valores negativos
- [x] Cobrir pesos negativos em testes do motor e da interface
- [x] Bloquear mínimo de hub negativo no endpoint Netlify e na interface
- [x] Testar a rejeição de mínimo de hub negativo no fluxo de produção
- [x] Cobrir a distinção entre pesos negativos e limiares não negativos
- [x] Validar no cliente a pontuação mínima de hub antes de salvar
- [x] Cobrir mínimo negativo em criação e edição de hub no endpoint publicado
- [x] Testar aceitação de peso negativo e rejeição de limiares negativos
- [x] Testar peso negativo real sem persistir alterações de teste
- [x] Cobrir a rejeição de todos os limiares comerciais negativos
- [x] Testar endpoint com peso real negativo usando isolamento sem persistência
- [x] Diagnosticar por que as configurações não estão sendo salvas em produção
- [x] Corrigir o fluxo de autenticação e persistência do painel de Configurações
- [x] Testar salvamento de parâmetros e hubs no ambiente publicado
- [x] Configurar CONTROL_PANEL_TOKEN no ambiente Netlify publicado
- [x] Exibir orientação clara quando a chave administrativa do Netlify estiver ausente
- [x] Remover a chave de acesso e a autorização do painel de Configurações
- [x] Permitir salvamento direto de hubs e parâmetros no Netlify
- [x] Validar o fluxo publicado sem senha
- [x] Persistir configurações em armazenamento compatível com Netlify quando a escrita no banco falhar
- [x] Fazer análise e PDF publicados lerem a mesma configuração persistida
- [x] Validar alteração e recarga reais no Netlify sem senha
- [x] Substituir a exigência anterior de CONTROL_PANEL_TOKEN por salvamento público conforme solicitação do usuário
- [x] Confirmar alteração real de parâmetro e recarga no Netlify
- [x] Confirmar alteração real de hub e recarga no Netlify
- [x] Remover definitivamente campo, estado e mensagem de senha do cliente
- [x] Validar um POST sem senha no Netlify e confirmar a persistência após recarregar
- [x] Atualizar a documentação para registrar que o painel é público sem CONTROL_PANEL_TOKEN
