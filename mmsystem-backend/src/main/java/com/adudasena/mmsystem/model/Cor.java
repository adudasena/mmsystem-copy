package com.adudasena.mmsystem.model;
import jakarta.persistence.*;
import lombok.Data;

@Entity @Table(name = "tb_cor") @Data
public class Cor {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true)
    private String nome;
    @Column(name = "hex_code")
    private String hexCode;

    @Column(name = "deleted_at")
    private java.time.LocalDateTime deletedAt;
}