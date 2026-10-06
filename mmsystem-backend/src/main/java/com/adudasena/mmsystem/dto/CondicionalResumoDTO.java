package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Condicional;

public record CondicionalResumoDTO(Long id, String status) {
    public static CondicionalResumoDTO from(Condicional condicional) {
        if (condicional == null) {
            return null;
        }
        return new CondicionalResumoDTO(condicional.getId(), condicional.getStatus());
    }
}
