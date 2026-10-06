package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Produto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ProdutoResponseDTO(
        Long id,
        String nome,
        String descricao,
        BigDecimal preco,
        String categoria,
        String coresText,
        String tamanhosText,
        String estoqueDetalhado,
        String fotos,
        String status,
        List<String> coresSelecionadas,
        List<String> tamanhosSelecionados,
        LocalDateTime deletedAt
) {
    public static ProdutoResponseDTO from(Produto produto) {
        if (produto == null) {
            return null;
        }
        return new ProdutoResponseDTO(
                produto.getId(),
                produto.getNome(),
                produto.getDescricao(),
                produto.getPreco(),
                produto.getCategoria(),
                produto.getCoresText(),
                produto.getTamanhosText(),
                produto.getEstoqueDetalhado(),
                produto.getFotos(),
                produto.getStatus(),
                produto.getCoresSelecionadas(),
                produto.getTamanhosSelecionados(),
                produto.getDeletedAt()
        );
    }
}
