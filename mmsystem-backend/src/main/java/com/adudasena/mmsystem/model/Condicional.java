package com.adudasena.mmsystem.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "condicionais")
@Data
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Condicional {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "fk_cliente_id", nullable = false)
    private Usuario usuario;

    @Column(name = "data_saida", nullable = false)
    private LocalDate dataSaida;

    @Column(name = "data_retorno")
    private LocalDate dataRetorno;

    @Column(nullable = false)
    private String status = "ABERTA";

    @Column(name = "valor_total", nullable = false)
    private BigDecimal valorTotal = BigDecimal.ZERO;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt; // Campo para Soft Delete

    // Relacionamento 1 para N com a entidade ItemCondicional separada
    @OneToMany(mappedBy = "condicional", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ItemCondicional> itens = new ArrayList<>();

    // Método utilitário para associar os itens e manter a consistência bidirecional
    public void adicionarItem(ItemCondicional item) {
        itens.add(item);
        item.setCondicional(this);
    }
}