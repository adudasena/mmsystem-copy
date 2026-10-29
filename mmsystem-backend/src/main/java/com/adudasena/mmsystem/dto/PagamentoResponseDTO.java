package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Pagamento;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PagamentoResponseDTO(
        Long id,
        BigDecimal valor,
        String metodoPagamento,
        Integer parcelas,
        LocalDate dataVencimento,
        String status,
        PedidoResumoDTO pedido,
        String clienteNome,
        String clienteTelefone,
        LocalDateTime deletedAt
) {
    public static PagamentoResponseDTO from(Pagamento pagamento) {
        if (pagamento == null) {
            return null;
        }
        var pedido = pagamento.getPedido();
        var cliente = pedido != null ? pedido.getCliente() : null;
        return new PagamentoResponseDTO(
                pagamento.getId(),
                pagamento.getValor(),
                pagamento.getMetodoPagamento() != null ? pagamento.getMetodoPagamento().name() : null,
                pagamento.getParcelas(),
                pagamento.getDataVencimento(),
                pagamento.getStatus() != null ? pagamento.getStatus().name() : null,
                PedidoResumoDTO.from(pedido),
                cliente != null ? cliente.getNome() : null,
                cliente != null ? cliente.getTelefone() : null,
                pagamento.getDeletedAt()
        );
    }
}
