package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.ItemPedido;

public record ItemPedidoResponseDTO(
        Long id,
        ProdutoResponseDTO produto,
        Integer quantidade
) {
    public static ItemPedidoResponseDTO from(ItemPedido item) {
        if (item == null) {
            return null;
        }
        return new ItemPedidoResponseDTO(
                item.getId(),
                ProdutoResponseDTO.from(item.getProduto()),
                item.getQuantidade()
        );
    }
}
