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
    
    // Período atual
    private BigDecimal totalVendasPeriodo;
    private long qtdVendasPeriodo;
    
    // Período anterior equivalente (para comparação)
    private BigDecimal totalVendasAnterior;
    private long qtdVendasAnterior;
    
    // Indicador de crescimento (porcentagem)
    private BigDecimal percentualCrescimentoValor;
    private BigDecimal percentualCrescimentoQtd;
}
