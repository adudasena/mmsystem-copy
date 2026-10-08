package com.adudasena.mmsystem.dto;

import java.math.BigDecimal;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardMetricasDTO {
    private long totalClientes;
    private long condicionaisAtivos;
    private long totalProdutos;
    private BigDecimal totalVendasPeriodo;
    private long qtdVendasPeriodo;
    private BigDecimal totalVendasAnterior;
    private long qtdVendasAnterior;
    private BigDecimal percentualCrescimentoValor;
    private BigDecimal percentualCrescimentoQtd;
    private long fiadosVencidos;
    private long condicionaisAtrasadas;
}
