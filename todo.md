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

- [ ] Avaliar e preparar a adaptação do backend para Netlify Functions
- [ ] Criar configuração de build e variáveis de ambiente para Netlify
- [ ] Orientar envio do projeto ao GitHub e conexão de deploy com Netlify

- [x] Consultar o CNPJ individual e exibir os dados em formulário editável
- [x] Aplicar alterações confirmadas pelo usuário ao cálculo, justificativa e PDF
- [x] Testar o fluxo de revisão cadastral antes da análise

- [x] Testar procedure de busca cadastral antes da análise
- [x] Cobrir o bloqueio de análise individual sem confirmação dos dados revisados
