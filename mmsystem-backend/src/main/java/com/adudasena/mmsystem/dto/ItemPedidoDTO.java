package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public class ItemPedidoDTO {
    @NotNull(message = "O produto do item é obrigatório.")
    private Long fkProdutoId;

    @NotNull(message = "A quantidade é obrigatória.")
    @Min(value = 1, message = "A quantidade deve ser pelo menos 1.")
    private Integer quantidade;

    public ItemPedidoDTO() {}

    public Long getFkProdutoId() { return fkProdutoId; }
    public void setFkProdutoId(Long fkProdutoId) { this.fkProdutoId = fkProdutoId; }
    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
}
