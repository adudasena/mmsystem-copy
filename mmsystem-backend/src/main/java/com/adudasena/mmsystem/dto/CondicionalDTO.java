package com.adudasena.mmsystem.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CondicionalDTO {
    @NotNull(message = "O cliente é obrigatório.")
    private Long clienteId;
    private Long funcionarioId;
    private LocalDate dataSaida;
    private LocalDate dataRetorno;
    private String status;

    @NotEmpty(message = "Informe ao menos um item na sacola.")
    @Valid
    private List<ItemSacolaDTO> itens;

    @Data
    public static class ItemSacolaDTO {
        @NotNull(message = "O produto é obrigatório.")
        private Long produtoId;
        @NotNull(message = "A quantidade é obrigatória.")
        private Integer quantidade;
        private String corEscolhida;
        private String tamanhoEscolhido;
        private String statusItem;
    }
}
