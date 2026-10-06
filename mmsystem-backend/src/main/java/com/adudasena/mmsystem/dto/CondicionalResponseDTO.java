package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Condicional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record CondicionalResponseDTO(
        Long id,
        UsuarioResponseDTO usuario,
        LocalDate dataSaida,
        LocalDate dataRetorno,
        String status,
        BigDecimal valorTotal,
        List<ItemCondicionalResponseDTO> itens,
        LocalDateTime deletedAt
) {
    public static CondicionalResponseDTO from(Condicional condicional) {
        if (condicional == null) {
            return null;
        }
        List<ItemCondicionalResponseDTO> itens = condicional.getItens() == null
                ? List.of()
                : condicional.getItens().stream().map(ItemCondicionalResponseDTO::from).toList();
        return new CondicionalResponseDTO(
                condicional.getId(),
                UsuarioResponseDTO.from(condicional.getUsuario()),
                condicional.getDataSaida(),
                condicional.getDataRetorno(),
                condicional.getStatus(),
                condicional.getValorTotal(),
                itens,
                condicional.getDeletedAt()
        );
    }
}
