# Plano de Correção e Padronização de Lixeira (Soft Delete) - MM System

Este documento estabelece o **plano detalhado de padronização universal da funcionalidade de Lixeira (Soft Delete / Registros Removidos)** em todos os 5 módulos do sistema: **Produtos, Condicionais, Pagamentos, Pedidos e Clientes**.

---

## 🎯 Objetivos Principais de Padronização

1. **Backend Unificado (Lógica de Soft Delete)**:
   - Todas as 5 entidades (`Produto`, `Condicional`, `Pagamento`, `Pedido`, `Usuario`) mantêm o campo `deletedAt`.
   - Todos os controllers expõem endpoints padronizados:
     - `GET /<modulo>` -> Lista apenas ativos (`deletedAt == null`).
     - `GET /<modulo>/excluidos` -> Lista apenas removidos na lixeira (`deletedAt != null`).
     - `DELETE /<modulo>/{id}` -> Executa o Soft Delete (`deletedAt = now()`), movendo o registro para a lixeira.
     - `PUT /<modulo>/{id}/restaurar` -> Restaura o registro da lixeira (`deletedAt = null`).
   - O histórico de transações antigas (pedidos, pagamentos, condicionais) permanece 100% preservado no banco de dados.

2. **Frontend Unificado (Interface Visual & Comportamento)**:
   - **Abas de Navegação Padronizadas**: Todos os 5 módulos possuem a mesma barra de abas no topo da tabela ("Ativos" vs "Removidos (Lixeira)").
   - **Modal de Confirmação Único**: Ao clicar no ícone de lixeira em um item ativo, abre-se o modal padronizado de confirmação:
     - *"Mover para a Lixeira"* -> *"Tem certeza que deseja mover [Nome/ID] para a lixeira? O histórico permanecerá intacto."*
   - **Aba de Removidos (Lixeira)**: Exibe a lista de registros excluídos com botão verde padronizado **"Restaurar"** (`RotateCcw`).
   - **Tipografia e Títulos**: Todos os cabeçalhos utilizam `text-3xl font-sans font-bold text-[#2d3a22]`.

---

## 📋 Detalhamento por Módulo

### 1. Pagamentos (Novo Soft Delete & Lixeira)
- **Backend**:
  - Adicionar `deletedAt` (`LocalDateTime`) na entidade `Pagamento`.
  - Atualizar `PagamentoRepository` com `findByDeletedAtIsNull` e `findByDeletedAtIsNotNull`.
  - Atualizar `PagamentoService` (`listarTodos`, `listarExcluidos`, `excluir` com soft delete, `restaurar`).
  - Adicionar endpoints em `PagamentoController`: `GET /pagamentos/excluidos` e `PUT /pagamentos/{id}/restaurar`.
- **Frontend**:
  - Em `pagamentos/page.tsx`, adicionar abas **Pagamentos Ativos** e **Pagamentos Removidos (Lixeira)**.
  - Adicionar modal de confirmação ao clicar na lixeira e botão de restaurar pagamento.

### 2. Condicionais (Nova Aba de Lixeira)
- **Backend**:
  - Adicionar `findByDeletedAtIsNotNull` em `CondicionalRepository`.
  - Adicionar `listarExcluidos` e `restaurar` em `CondicionalService`.
  - Adicionar endpoints em `CondicionalController`: `GET /condicionais/excluidos` e `PUT /condicionais/{id}/restaurar`.
- **Frontend**:
  - Em `condicionais/page.tsx`, integrar a aba **Sacolas Removidas (Lixeira)** na barra superior da tabela e suporte a restauração.

### 3. Pedidos (Correção de Busca da Lixeira)
- **Backend**:
  - Garantir que `listarExcluidos` e `listarTodos` filtrem estritamente por `deletedAtIsNotNull` e `deletedAtIsNull`.
- **Frontend**:
  - Em `pedidos/page.tsx`, corrigir a busca da aba de removidos para chamar `/pedidos/excluidos` sem misturar com os pedidos ativos.

### 4. Clientes / Usuários (Correção da Lixeira e Modal)
- **Frontend**:
  - Em `usuarios/page.tsx`, acionar a modal de confirmação ao clicar no botão de lixeira de um cliente.
  - Garantir que clientes desativados fiquem visíveis na aba **Clientes Inativos (Lixeira)** com a opção de reativação imediata.

### 5. Produtos (Padronização Visual)
- **Frontend**:
  - Em `produtos/page.tsx`, adaptar a barra de abas e modal de exclusão ao exato padrão visual unificado.

---

## 🛠️ Arquivos Envolvidos

### Módulo Backend (`mmsystem-backend`):
- `model/Pagamento.java`
- `repository/PagamentoRepository.java`
- `repository/CondicionalRepository.java`
- `service/PagamentoService.java`
- `service/CondicionalService.java`
- `controller/PagamentoController.java`
- `controller/CondicionalController.java`

### Módulo Frontend (`mmsystem-frontend`):
- `src/app/(admin)/pagamentos/page.tsx`
- `src/app/(admin)/condicionais/page.tsx`
- `src/app/(admin)/pedidos/page.tsx`
- `src/app/(admin)/usuarios/page.tsx`
- `src/app/(admin)/produtos/page.tsx`

---

## ⚡ Status: PLANO CRIADO — AGUARDANDO APROVAÇÃO DO USUÁRIO
