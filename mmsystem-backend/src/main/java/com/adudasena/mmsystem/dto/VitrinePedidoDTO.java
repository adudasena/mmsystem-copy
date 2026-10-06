package com.adudasena.mmsystem.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class VitrinePedidoDTO {
    private Long usuarioId;

    @NotBlank(message = "O nome é obrigatório.")
    private String nomeCliente;

    @NotBlank(message = "O WhatsApp é obrigatório.")
    private String telefoneCliente;

    @NotEmpty(message = "A sacola precisa ter ao menos um item.")
    @Valid
    private List<VitrineItemDTO> itens;

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public String getNomeCliente() { return nomeCliente; }
    public void setNomeCliente(String nomeCliente) { this.nomeCliente = nomeCliente; }

    public String getTelefoneCliente() { return telefoneCliente; }
    public void setTelefoneCliente(String telefoneCliente) { this.telefoneCliente = telefoneCliente; }

    public List<VitrineItemDTO> getItens() { return itens; }
    public void setItens(List<VitrineItemDTO> itens) { this.itens = itens; }
}
