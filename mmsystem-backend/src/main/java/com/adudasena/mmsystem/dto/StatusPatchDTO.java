package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.NotBlank;

public record StatusPatchDTO(
        @NotBlank(message = "O status é obrigatório.") String status
) {
}
