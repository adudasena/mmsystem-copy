package com.adudasena.mmsystem.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "itens_pedido")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ItemPedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fk_pedido_id", nullable = false)
    @JsonIgnore // Evita o loop de recursão infinita na serialização do JSON
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.EAGER) // Carrega os dados do produto junto com o item
    @JoinColumn(name = "fk_produto_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Produto produto;

    @Column(nullable = false)
    private Integer quantidade;

    /** Variação vendida; usada para devolver ao estoque certo se o pedido for cancelado. */
    @Column(name = "cor_escolhida")
    private String corEscolhida;

    @Column(name = "tamanho_escolhido")
    private String tamanhoEscolhido;

    public ItemPedido() {}

    public String getCorEscolhida() { return corEscolhida; }
    public void setCorEscolhida(String corEscolhida) { this.corEscolhida = corEscolhida; }

    public String getTamanhoEscolhido() { return tamanhoEscolhido; }
    public void setTamanhoEscolhido(String tamanhoEscolhido) { this.tamanhoEscolhido = tamanhoEscolhido; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Pedido getPedido() { return pedido; }
    public void setPedido(Pedido pedido) { this.pedido = pedido; }

    public Produto getProduto() { return produto; }
    public void setProduto(Produto produto) { this.produto = produto; }

    public Integer getQuantidade() { return quantidade; }
    public void setQuantidade(Integer quantidade) { this.quantidade = quantidade; }
}