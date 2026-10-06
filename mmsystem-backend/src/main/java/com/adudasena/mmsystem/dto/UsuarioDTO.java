package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UsuarioDTO {
    @NotBlank(message = "O nome é obrigatório.")
    private String nome;

    @NotBlank(message = "O telefone é obrigatório.")
    private String telefone;

    private String email;
    private String senha;
    private String perfil;
}
