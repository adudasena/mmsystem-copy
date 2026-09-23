package com.adudasena.mmsystem.dto;

import com.adudasena.mmsystem.model.Usuario;

import java.time.LocalDateTime;

public record UsuarioResponseDTO(
        Long id,
        String nome,
        String telefone,
        String email,
        String perfil,
        LocalDateTime deletedAt
) {
    public static UsuarioResponseDTO from(Usuario usuario) {
        if (usuario == null) {
            return null;
        }
        return new UsuarioResponseDTO(
                usuario.getId(),
                usuario.getNome(),
                usuario.getTelefone(),
                usuario.getEmail(),
                usuario.getPerfil() != null ? usuario.getPerfil().name() : null,
                usuario.getDeletedAt()
        );
    }
}
