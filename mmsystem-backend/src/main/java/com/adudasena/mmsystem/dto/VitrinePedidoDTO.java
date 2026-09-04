package com.adudasena.mmsystem.dto;

import java.util.List;

public class VitrinePedidoDTO {
    private Long usuarioId;
    private String nomeCliente;
    private String telefoneCliente;
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