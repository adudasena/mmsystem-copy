package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class VitrineItemDTO {
    @NotNull(message = "O produto é obrigatório.")
    private Long produtoId;

    @NotNull(message = "A quantidade é obrigatória.")
    @Min(value = 1, message = "A quantidade deve ser pelo menos 1.")
    private Integer quantidade;

    private String corEscolhida;
    private String tamanhoEscolhido;
}
