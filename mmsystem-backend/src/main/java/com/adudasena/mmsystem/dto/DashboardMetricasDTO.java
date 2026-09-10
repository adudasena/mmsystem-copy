package com.adudasena.mmsystem.dto;

public class DashboardMetricasDTO {
    private long totalClientes;
    private long condicionaisAtivos;
    private long totalProdutos;

    public DashboardMetricasDTO() {}

    public DashboardMetricasDTO(long totalClientes, long condicionaisAtivos, long totalProdutos) {
        this.totalClientes = totalClientes;
        this.condicionaisAtivos = condicionaisAtivos;
        this.totalProdutos = totalProdutos;
    }

    public long getTotalClientes() { return totalClientes; }
    public void setTotalClientes(long totalClientes) { this.totalClientes = totalClientes; }

    public long getCondicionaisAtivos() { return condicionaisAtivos; }
    public void setCondicionaisAtivos(long condicionaisAtivos) { this.condicionaisAtivos = condicionaisAtivos; }

    public long getTotalProdutos() { return totalProdutos; }
    public void setTotalProdutos(long totalProdutos) { this.totalProdutos = totalProdutos; }
}
