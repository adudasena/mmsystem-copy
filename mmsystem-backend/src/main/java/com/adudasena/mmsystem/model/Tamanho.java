package com.adudasena.mmsystem.model;
import jakarta.persistence.*;
import lombok.Data;

@Entity @Table(name = "tb_tamanho") @Data
public class Tamanho {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String nome;

    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;
}