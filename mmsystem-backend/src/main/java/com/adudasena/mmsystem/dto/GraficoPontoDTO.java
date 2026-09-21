package com.adudasena.mmsystem.dto;

import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GraficoPontoDTO {
    private String label;
    private String data;
    private BigDecimal faturamento;
    private long quantidadeVendas;
}
