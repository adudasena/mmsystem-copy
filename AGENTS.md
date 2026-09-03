# Directivas e Regras do Projeto - MM System

Este arquivo estabelece os padrões de desenvolvimento, arquitetura e diretrizes operacionais para o agente Antigravity no projeto **MM System**.

---

## 📌 Contexto do Projeto

O **MM System** é uma aplicação Fullstack composta por:
- **Backend**: `mmsystem-backend` (Java + Spring Boot + Spring Security 6 + Spring Data JPA + JWT + PostgreSQL/MySQL)
- **Frontend**: `mmsystem-frontend` (React + Vite + Vanilla CSS)

---

## 🚀 Foco e Prioridades de Desenvolvimento

O trabalho deve seguir rigorosamente a seguinte ordem de prioridades:

### 🥊 PRIORIDADE 1: Correção e Estabilização do Spring Security (Foco Imediato)
- **Rotas Públicas (Cliente)**: Vitrine Digital (`/vitrine/**`, `/pedidos/vitrine`, `GET /produtos/**`) e endpoints de autenticação (`/auth/**`).
- **Painel Administrativo (Proprietária / Funcionário)**: Todos os demais endpoints (`/pedidos/**`, `/pagamentos/**`, `/condicionais/**`, `/usuarios/**`, mutações em `/produtos/**`) exigem autorização via roles `ROLE_PROPRIETARIA` ou `ROLE_FUNCIONARIO`.
- **Estabilização**: Garantir JWT stateless, CORS liberado para o frontend, e tratamento adequado de erros `401 Unauthorized` e `403 Forbidden`.

### ⚡ PRIORIDADE 2: Expansão de Funcionalidades
- Somente após o Spring Security estar totalmente resolvido e verificado, proceder com a adição de novos módulos e funcionalidades (Gestão de Produtos, Vitrine, Pedidos, Condicionais, Pagamentos e Relatórios).
- Manter o padrão arquitetural em camadas bem definidas.

---

## 📂 Módulos de Regras Detalhadas

Para diretrizes específicas, consulte e siga as regras armazenadas em `.agents/rules/`:
1. [Spring Security Rules](.agents/rules/spring-security.md)
2. [Feature Development Rules](.agents/rules/feature-development.md)

---

## 🛡️ Regras Gerais de Código e Conduta

1. **Validação Obrigatória**:
   - Sempre verificar o status da compilação e execução (`mvn compile`, testes unitários) após modificar rotas ou configurações de segurança.
2. **Padrão RESTful**:
   - Controladores devem retornar DTOs (Data Transfer Objects) sanitizados, nunca entidades JPA brutas expondo senhas ou dados sensíveis.
3. **Erros e Logs**:
   - Utilizar `@RestControllerAdvice` para centralizar o tratamento de exceções com payloads padronizados de erro.
4. **Segurança do Frontend**:
   - O frontend React deve armazenar o JWT de forma segura e anexá-lo via Interceptor em requisições HTTP autenticadas.
