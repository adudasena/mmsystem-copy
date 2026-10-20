package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Produto;

import java.math.BigDecimal;

public record ProdutoOpcaoDTO(
        Long id,
        String nome,
        BigDecimal preco,
        String estoqueDetalhado,
        java.util.List<String> coresSelecionadas,
        java.util.List<String> tamanhosSelecionados
) {
    public static ProdutoOpcaoDTO from(Produto produto) {
        if (produto == null) {
            return null;
        }
        return new ProdutoOpcaoDTO(
                produto.getId(),
                produto.getNome(),
                produto.getPreco(),
                produto.getEstoqueDetalhado(),
                produto.getCoresSelecionadas(),
                produto.getTamanhosSelecionados()
        );
    }
}
