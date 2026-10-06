package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.DashboardMetricasDTO;
import com.adudasena.mmsystem.dto.GraficoPontoDTO;
import com.adudasena.mmsystem.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/metricas")
    public ResponseEntity<DashboardMetricasDTO> obterMetricas(
            @RequestParam(required = false) String dataInicio,
            @RequestParam(required = false) String dataFim) {
        return ResponseEntity.ok(dashboardService.obterMetricas(dataInicio, dataFim));
    }

    @GetMapping("/grafico")
    public ResponseEntity<List<GraficoPontoDTO>> obterDadosGrafico(
            @RequestParam(required = false) String dataInicio,
            @RequestParam(required = false) String dataFim) {
        return ResponseEntity.ok(dashboardService.obterDadosGrafico(dataInicio, dataFim));
    }
}
