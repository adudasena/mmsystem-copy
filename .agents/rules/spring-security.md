# Regras de Desenvolvimento: Spring Security (Foco Imediato)

Esta diretiva define as regras e padrões obrigatórios para a refatoração, configuração e manutenção do **Spring Security 6+** no módulo `mmsystem-backend`.

---

## 1. Diretrizes de Configuração (`SecurityConfig.java`)

### A. Sintaxe e Correspondência de Rotas (`requestMatchers`)
- **Limpeza de Strings de URL**: Nunca inclua vírgulas, espaços ou caracteres incorretos dentro de literals de URL no `requestMatchers` (ex.: use `"/vitrine/**"` em vez de `"/vitrine/**, "`).
- **Organização de Permissões**:
  - **Rotas Públicas (`.permitAll()`)**: Apenas a Vitrine Digital (`/vitrine/**`, `/pedidos/vitrine`, `GET /produtos/**`) e endpoints de autenticação (`/auth/**`).
  - **Rotas de Administração (`.hasAnyRole("PROPRIETARIA", "FUNCIONARIO")`)**: Todos os demais endpoints do sistema (`/pedidos/**`, `/pagamentos/**`, `/condicionais/**`, `/usuarios/**`, operações de escrita em `/produtos/**`, etc.) são restritos exclusivamente aos perfis `ROLE_PROPRIETARIA` e `ROLE_FUNCIONARIO`.

### B. Proteção e Sessão (Stateless JWT)
- **CSRF**: Deve permanecer desabilitado (`.csrf(csrf -> csrf.disable())`) por se tratar de uma API REST stateless autenticada via tokens bearer.
- **Sessão**: Configurar explicitamente para modo stateless:
  ```java
  .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
  ```
- **CORS**: Configurar a política de CORS de forma explícita permitindo as origens do frontend (`http://localhost:5173`, etc.), métodos HTTP (GET, POST, PUT, DELETE, OPTIONS) e cabeçalhos autorizados (`Authorization`, `Content-Type`).

---

## 2. Filtro de Autenticação JWT (`JwtAuthFilter.java`)

- **Posicionamento do Filtro**: O `JwtAuthFilter` deve ser injetado antes do `UsernamePasswordAuthenticationFilter`:
  ```java
  .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
  ```
- **Validação de Cabeçalho Authorization**:
  - Verificar se o cabeçalho existe e começa com `Bearer `.
  - Tratar exceções de token expirado, nulo ou malformado sem derrubar a aplicação, retornando código HTTP `401 Unauthorized` limpo.
- **Contexto de Segurança**:
  - Se o token for válido, popular o `SecurityContextHolder.getContext().setAuthentication(...)`.
  - Garantir a limpeza do contexto caso a validação falhe.

---

## 3. Criptografia de Senhas e DTOs

- **Encoder**: Utilizar obrigatoriamente `BCryptPasswordEncoder` como `@Bean` de `PasswordEncoder`.
- **Sanitização**: DTOs de saída (como `UsuarioResponseDTO`) nunca devem conter a propriedade `senha`.
- **Payloads de Autenticação**: O DTO de resposta do login deve retornar o token JWT, tempo de expiração e dados básicos de perfil (sem a senha).

---

## 4. Checklist de Verificação de Segurança

Ao alterar a camada de segurança, verifique:
- [ ] O login `/auth/login` retorna status `200 OK` com token JWT válido.
- [ ] Requisições para rotas protegidas sem header `Authorization` retornam `401 Unauthorized`.
- [ ] Requisições com token válido acessam com sucesso as rotas autorizadas (`200 OK` / `201 Created`).
- [ ] Nenhuma rota pública ou protegida falha por erro de parsing de string no `requestMatchers`.
