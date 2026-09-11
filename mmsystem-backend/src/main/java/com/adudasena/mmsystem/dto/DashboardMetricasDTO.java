package com.adudasena.mmsystem.dto;

import java.math.BigDecimal;

public class DashboardMetricasDTO {
    private long totalClientes;
    private long condicionaisAtivos;
    private long totalProdutos;
    private BigDecimal totalVendasMes;
    private BigDecimal totalVendasHoje;
    private long qtdVendasMes;
    private long qtdVendasHoje;

    public DashboardMetricasDTO() {}

    public DashboardMetricasDTO(long totalClientes, long condicionaisAtivos, long totalProdutos, 
                                BigDecimal totalVendasMes, BigDecimal totalVendasHoje, 
                                long qtdVendasMes, long qtdVendasHoje) {
        this.totalClientes = totalClientes;
        this.condicionaisAtivos = condicionaisAtivos;
        this.totalProdutos = totalProdutos;
        this.totalVendasMes = totalVendasMes != null ? totalVendasMes : BigDecimal.ZERO;
        this.totalVendasHoje = totalVendasHoje != null ? totalVendasHoje : BigDecimal.ZERO;
        this.qtdVendasMes = qtdVendasMes;
        this.qtdVendasHoje = qtdVendasHoje;
    }

    public long getTotalClientes() { return totalClientes; }
    public void setTotalClientes(long totalClientes) { this.totalClientes = totalClientes; }

    public long getCondicionaisAtivos() { return condicionaisAtivos; }
    public void setCondicionaisAtivos(long condicionaisAtivos) { this.condicionaisAtivos = condicionaisAtivos; }

    public long getTotalProdutos() { return totalProdutos; }
    public void setTotalProdutos(long totalProdutos) { this.totalProdutos = totalProdutos; }

    public BigDecimal getTotalVendasMes() { return totalVendasMes; }
    public void setTotalVendasMes(BigDecimal totalVendasMes) { this.totalVendasMes = totalVendasMes; }

    public BigDecimal getTotalVendasHoje() { return totalVendasHoje; }
    public void setTotalVendasHoje(BigDecimal totalVendasHoje) { this.totalVendasHoje = totalVendasHoje; }

    public long getQtdVendasMes() { return qtdVendasMes; }
    public void setQtdVendasMes(long qtdVendasMes) { this.qtdVendasMes = qtdVendasMes; }

    public long getQtdVendasHoje() { return qtdVendasHoje; }
    public void setQtdVendasHoje(long qtdVendasHoje) { this.qtdVendasHoje = qtdVendasHoje; }
}

