# Regras de Desenvolvimento: Expansão de Funcionalidades

Esta diretiva define o padrão para a criação de novas funcionalidades no **MM System** após a conclusão e validação do Spring Security.

---

## 1. Arquitetura em Camadas (Backend)

Todo novo módulo no `mmsystem-backend` deve seguir rigorosamente a estrutura abaixo:

```
src/main/java/com/adudasena/mmsystem/
├── controller/   # Endpoints REST (@RestController, @RequestMapping)
├── service/      # Regras de negócio e transações (@Service, @Transactional)
├── repository/   # Interfaces de persistência JPA (@Repository)
├── model/        # Entidades JPA (@Entity)
├── dto/          # Objetos de transferência de dados (Request / Response DTOs)
└── exception/    # Tratamento customizado de erros
```

### Regras por Camada:
1. **Controllers**:
   - Devem focar apenas no recebimento de requisições, delegação para o `Service` e resposta HTTP com DTOs.
   - Usar anotações de validação (`@Valid`) nos DTOs de entrada.
2. **Services**:
   - Conter 100% das regras de negócio e validações lógicas.
   - Usar anotação `@Transactional` onde houver escrita ou mutação de dados.
3. **Repositories**:
   - Estender `JpaRepository<Entity, Long>`.
   - Criar queries customizadas usando JPQL ou Spring Data Method Names.
4. **DTOs**:
   - Utilizar Java `record` ou classes imutáveis para DTOs.
   - Separar DTOs de criação (`XxxRequestDTO`) de DTOs de exibição (`XxxResponseDTO`).

---

## 2. Padrões do Frontend (`mmsystem-frontend`)

1. **Cliente HTTP & Interceptors**:
   - Centralizar chamadas HTTP em um módulo `api.js` ou `axios.js`.
   - Adicionar o token JWT automaticamente no cabeçalho `Authorization: Bearer <token>`.
   - Tratar respostas `401` com redirecionamento automático para a tela de login.
2. **Componentização e CSS**:
   - Manter estilos em CSS modular/vanilla.
   - Separar páginas da aplicação (views) dos componentes reutilizáveis (botões, modais, tabelas).

---

## 3. Workflow de Desenvolvimento e Validação

Ao implementar qualquer nova funcionalidade:
1. **Validação Prévia**: Garantir que as rotas necessárias estão liberadas ou protegidas corretamente no `SecurityConfig.java`.
2. **Implementação Incremental**: Criar Entidade -> Repository -> Service -> Controller -> Tela Frontend.
3. **Testes**: Executar compilação e testes no backend antes de reportar a conclusão da funcionalidade.
