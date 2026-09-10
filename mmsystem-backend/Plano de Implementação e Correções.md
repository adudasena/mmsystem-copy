# Plano de Implementação e Correções do MVP (MM System)

Este roteiro estabelece a sequência cronológica de tarefas organizadas por ordem de prioridade técnica para garantir o fechamento do MVP e a consistência das regras de negócio.
---

### **Prioridade 1: Validações de Negócio no Back-end e Regras de Estoque**

* **Validação de Estoque por Grade (`VitrinePedidoDTO`)**
  * Implementar no `CondicionalService` / `PedidoService` a verificação das quantidades disponíveis na estrutura JSON do produto antes da persistência.
  * Recusar a requisição no Spring Boot caso a quantidade solicitada para determinada cor/tamanho seja superior ao saldo em estoque.

* **Validação do Decremento e Consistência no PostgreSQL**
  * Testar e validar o método de atualização de estoque para garantir a baixa correta na coluna de estoque detalhado (JSON) no banco de dados quando um item transita para os estados "Vendido" ou "Em Condicional".

---

### **Prioridade 2: Tratamento de Erros e Retornos Visuais no Front-end (Next.js)**

* **Alertas e Feedback Visual para o Usuário**
  * Tratar as respostas de erro da API no *front-end* exibindo notificações amigáveis na interface (ex.: *"Peça indisponível no tamanho selecionado"* ou *"Saldo insuficiente em estoque"*).
  * Impedir que erros de requisição travem a interface da Vitrine Digital ou do Painel Administrativo.

---

### **Prioridade 3: Consolidação do Painel Administrativo (Gestão)**

* **Métricas e Cartões do Dashboard**
  * Conectar os cartões da tela inicial do Painel Administrativo (que está vazia por enquanto, apenas com o Bem vinda) às consultas de contagem do banco de dados (Total de Clientes cadastrados, Condicionais Ativos e Produtos Cadastrados).

* **Ajustes de Usabilidade e Gestão de Clientes**
  * Validar o formulário de cadastro de produtos, busca por termos semelhantes e tratamento de nomes no catálogo.
  * Verificar o fluxo completo da Tela de Clientes, garantindo as operações de cadastro, edição, busca e a aplicação da inativação lógica via `deleted_at`.

---

### **Prioridade 4: Integração de Saída da Vitrine (WhatsApp Nativo)**

* **Redirecionamento com Mensagem Formatada (`wa.me`)**
  * Configurar a finalização da Sacola de Interesse na Vitrine Digital para gerar o link nativo do WhatsApp (`https://wa.me/55439996623157?text=...`).
  * Estruturar a mensagem predefinida contendo a relação dos produtos selecionados, variações (cor/tamanho), valores unitários e o subtotal acumulado.
* Corrigir para que a cor e tamanho disponíveis na parte de adicionar à sacola, sejam só os disponíveis no estoque do produto

---

### **Prioridade 5: Validação do Fluxo de Ponta a Ponta (End-to-End)**

* **Bateria de Testes do Ciclo Completo de Negócio**
  * Executar a simulação de uso real do sistema na seguinte ordem:
    1. Cadastrar novo produto no Painel Administrativo.
    2. Visualizar a peça atualizada na Vitrine Digital pública.
    3. Montar a sacola na vitrine e simular a emissão do pedido via WhatsApp.
    4. Registrar a saída em condicional no Painel Administrativo e verificar o bloqueio do item no estoque.
    5. Processar a devolução/baixa do condicional, confirmando a conversão em venda e a gravação do débito no módulo de Pagamentos.