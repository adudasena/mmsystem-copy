package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Pedido;

import java.math.BigDecimal;

public record PedidoResumoDTO(Long id, BigDecimal valorTotal) {
    public static PedidoResumoDTO from(Pedido pedido) {
        if (pedido == null) {
            return null;
        }
        return new PedidoResumoDTO(pedido.getId(), pedido.getValorTotal());
    }
}
