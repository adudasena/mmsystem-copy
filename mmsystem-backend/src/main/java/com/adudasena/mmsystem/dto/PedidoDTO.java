package com.adudasena.mmsystem.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class PedidoDTO {
    private Long id;
    private LocalDate dataPedido;
    private String status;
    private BigDecimal valorTotal;

    @NotNull(message = "O cliente é obrigatório.")
    private Long fkClienteId;

    private Long fkCondicionalId;

    @NotEmpty(message = "Informe ao menos um item.")
    @Valid
    private List<ItemPedidoDTO> itens;

    public PedidoDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDate getDataPedido() { return dataPedido; }
    public void setDataPedido(LocalDate dataPedido) { this.dataPedido = dataPedido; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public BigDecimal getValorTotal() { return valorTotal; }
    public void setValorTotal(BigDecimal valorTotal) { this.valorTotal = valorTotal; }
    public Long getFkClienteId() { return fkClienteId; }
    public void setFkClienteId(Long fkClienteId) { this.fkClienteId = fkClienteId; }
    public Long getFkCondicionalId() { return fkCondicionalId; }
    public void setFkCondicionalId(Long fkCondicionalId) { this.fkCondicionalId = fkCondicionalId; }
    public List<ItemPedidoDTO> getItens() { return itens; }
    public void setItens(List<ItemPedidoDTO> itens) { this.itens = itens; }
}
