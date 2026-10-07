package com.adudasena.mmsystem.dto;

public record VitrineCheckoutResponseDTO(
        String tipoFluxo,
        CondicionalResponseDTO condicional,
        PedidoResponseDTO pedido
) {
}
