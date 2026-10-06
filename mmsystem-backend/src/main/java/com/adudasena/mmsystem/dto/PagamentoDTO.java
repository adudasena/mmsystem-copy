package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public class PagamentoDTO {
    private Long id;

    @NotNull(message = "O valor é obrigatório.")
    @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero.")
    private BigDecimal valor;

    @NotBlank(message = "O método de pagamento é obrigatório.")
    private String metodoPagamento;

    private LocalDate dataVencimento;
    private String status;
    private Long fkPedidoId;

    public PagamentoDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }
    public String getMetodoPagamento() { return metodoPagamento; }
    public void setMetodoPagamento(String metodoPagamento) { this.metodoPagamento = metodoPagamento; }
    public LocalDate getDataVencimento() { return dataVencimento; }
    public void setDataVencimento(LocalDate dataVencimento) { this.dataVencimento = dataVencimento; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getFkPedidoId() { return fkPedidoId; }
    public void setFkPedidoId(Long fkPedidoId) { this.fkPedidoId = fkPedidoId; }
}
