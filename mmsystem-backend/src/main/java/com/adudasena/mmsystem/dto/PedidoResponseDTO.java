package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Pedido;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record PedidoResponseDTO(
        Long id,
        LocalDate dataPedido,
        String status,
        BigDecimal valorTotal,
        UsuarioResponseDTO cliente,
        CondicionalResumoDTO condicional,
        List<ItemPedidoResponseDTO> itens,
        LocalDateTime deletedAt
) {
    public static PedidoResponseDTO from(Pedido pedido) {
        if (pedido == null) {
            return null;
        }
        List<ItemPedidoResponseDTO> itens = pedido.getItens() == null
                ? List.of()
                : pedido.getItens().stream().map(ItemPedidoResponseDTO::from).toList();
        return new PedidoResponseDTO(
                pedido.getId(),
                pedido.getDataPedido(),
                pedido.getStatus() != null ? pedido.getStatus().name() : null,
                pedido.getValorTotal(),
                UsuarioResponseDTO.from(pedido.getCliente()),
                CondicionalResumoDTO.from(pedido.getCondicional()),
                itens,
                pedido.getDeletedAt()
        );
    }
}
