package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.ItemCondicional;

public record ItemCondicionalResponseDTO(
        Long id,
        ProdutoResponseDTO produto,
        Integer quantidade,
        String corEscolhida,
        String tamanhoEscolhido,
        String statusItem
) {
    public static ItemCondicionalResponseDTO from(ItemCondicional item) {
        if (item == null) {
            return null;
        }
        return new ItemCondicionalResponseDTO(
                item.getId(),
                ProdutoResponseDTO.from(item.getProduto()),
                item.getQuantidade(),
                item.getCorEscolhida(),
                item.getTamanhoEscolhido(),
                item.getStatusItem()
        );
    }
}
