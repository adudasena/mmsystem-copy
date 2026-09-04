-- ==============================================================================
-- Script de Limpeza de Dados de Teste - MM System
-- Preserva estritamente a conta da Proprietária e limpa os dados transacionais
-- ==============================================================================

-- 1. Limpar dependências de pagamentos
DELETE FROM pagamentos;

-- 2. Limpar itens de pedidos e pedidos
DELETE FROM itens_pedido;
DELETE FROM pedidos;

-- 3. Limpar itens de condicionais e condicionais
DELETE FROM itens_condicional;
DELETE FROM condicionais;

-- 4. Limpar produtos cadastrados em testes
DELETE FROM produtos;

-- 5. Limpar clientes de teste, mantendo apenas a Proprietária / Administradora
DELETE FROM usuarios 
WHERE perfil != 'ROLE_PROPRIETARIA';

-- Reiniciar sequências de IDs (opcional, para organização)
ALTER SEQUENCE IF EXISTS pagamentos_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS itens_pedido_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS pedidos_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS itens_condicional_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS condicionais_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS produtos_id_seq RESTART WITH 1;
