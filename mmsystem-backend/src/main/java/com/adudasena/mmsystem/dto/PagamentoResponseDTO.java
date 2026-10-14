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
        LocalDateTime deletedAt
) {
    public static PagamentoResponseDTO from(Pagamento pagamento) {
        if (pagamento == null) {
            return null;
        }
        return new PagamentoResponseDTO(
                pagamento.getId(),
                pagamento.getValor(),
                pagamento.getMetodoPagamento() != null ? pagamento.getMetodoPagamento().name() : null,
                pagamento.getParcelas(),
                pagamento.getDataVencimento(),
                pagamento.getStatus() != null ? pagamento.getStatus().name() : null,
                PedidoResumoDTO.from(pagamento.getPedido()),
                pagamento.getDeletedAt()
        );
    }
}
