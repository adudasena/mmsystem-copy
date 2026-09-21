package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.DashboardMetricasDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.PedidoRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import lombok.RequiredArgsConstructor;
import java.util.List;

@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class DashboardController {

    private static final Logger logger = LoggerFactory.getLogger(DashboardController.class);

    private final UsuarioRepository usuarioRepository;
    private final CondicionalRepository condicionalRepository;
    private final ProdutoRepository produtoRepository;
    private final PedidoRepository pedidoRepository;

    @GetMapping("/metricas")
    public ResponseEntity<DashboardMetricasDTO> obterMetricas(
            @RequestParam(required = false) String dataInicio,
            @RequestParam(required = false) String dataFim) {

        long totalClientes = 0;
        long condicionaisAtivos = 0;
        long totalProdutos = 0;

        try {
            totalClientes = usuarioRepository.findAll().stream()
                    .filter(u -> u != null && u.getDeletedAt() == null)
                    .filter(u -> u.getPerfil() == Perfil.ROLE_CLIENTE)
                    .count();
        } catch (Exception e) {
            logger.error("Erro ao obter total de clientes no dashboard: ", e);
        }

        try {
            condicionaisAtivos = condicionalRepository.findAll().stream()
                    .filter(c -> c != null && c.getDeletedAt() == null)
                    .filter(c -> "ABERTA".equalsIgnoreCase(c.getStatus())
                            || "EM_CONDICIONAL".equalsIgnoreCase(c.getStatus()))
                    .count();
        } catch (Exception e) {
            logger.error("Erro ao obter condicionais ativos no dashboard: ", e);
        }

        try {
            totalProdutos = produtoRepository.findAll().stream()
                    .filter(p -> p != null && p.getDeletedAt() == null)
                    .count();
        } catch (Exception e) {
            logger.error("Erro ao obter total de produtos no dashboard: ", e);
        }

        LocalDate inicio;
        try {
            inicio = (dataInicio != null && !dataInicio.isBlank()) 
                    ? LocalDate.parse(dataInicio.trim()) 
                    : LocalDate.now().withDayOfMonth(1);
        } catch (Exception e) {
            inicio = LocalDate.now().withDayOfMonth(1);
        }

        LocalDate fim;
        try {
            fim = (dataFim != null && !dataFim.isBlank()) 
                    ? LocalDate.parse(dataFim.trim()) 
                    : LocalDate.now();
        } catch (Exception e) {
            fim = LocalDate.now();
        }

        // Validação 1: Data de início não pode ser futura
        if (inicio.isAfter(LocalDate.now())) {
            inicio = LocalDate.now();
        }

        // Validação 2: Data final não pode ser menor que data de início
        if (fim.isBefore(inicio)) {
            fim = inicio;
        }

        long dias = java.time.temporal.ChronoUnit.DAYS.between(inicio, fim) + 1;
        LocalDate inicioAnterior = inicio.minusDays(dias);
        LocalDate fimAnterior = fim.minusDays(dias);

        BigDecimal totalVendasPeriodo = BigDecimal.ZERO;
        long qtdVendasPeriodo = 0;
        BigDecimal totalVendasAnterior = BigDecimal.ZERO;
        long qtdVendasAnterior = 0;

        try {
            List<Pedido> pedidos = pedidoRepository.findAll();

            List<Pedido> pedidosValidos = pedidos != null ? pedidos.stream()
                    .filter(p -> p != null && p.getStatus() != StatusPedido.CANCELADO && p.getDeletedAt() == null)
                    .toList() : Collections.emptyList();

            // Período atual
            final LocalDate dataInicioFinal = inicio;
            final LocalDate dataFimFinal = fim;
            List<Pedido> pedidosNoPeriodo = pedidosValidos.stream()
                    .filter(p -> p.getDataPedido() != null && !p.getDataPedido().isBefore(dataInicioFinal)
                            && !p.getDataPedido().isAfter(dataFimFinal))
                    .toList();

            totalVendasPeriodo = pedidosNoPeriodo.stream()
                    .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            qtdVendasPeriodo = pedidosNoPeriodo.size();

            // Período anterior
            final LocalDate inicioAntFinal = inicioAnterior;
            final LocalDate fimAntFinal = fimAnterior;
            List<Pedido> pedidosNoPeriodoAnterior = pedidosValidos.stream()
                    .filter(p -> p.getDataPedido() != null && !p.getDataPedido().isBefore(inicioAntFinal)
                            && !p.getDataPedido().isAfter(fimAntFinal))
                    .toList();

            totalVendasAnterior = pedidosNoPeriodoAnterior.stream()
                    .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            qtdVendasAnterior = pedidosNoPeriodoAnterior.size();

        } catch (Exception e) {
            logger.error("Erro ao calcular vendas do dashboard: ", e);
        }

        BigDecimal percCrescimentoValor = BigDecimal.ZERO;
        if (totalVendasAnterior.compareTo(BigDecimal.ZERO) > 0) {
            percCrescimentoValor = totalVendasPeriodo.subtract(totalVendasAnterior)
                    .divide(totalVendasAnterior, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
        } else if (totalVendasPeriodo.compareTo(BigDecimal.ZERO) > 0) {
            percCrescimentoValor = new BigDecimal("100");
        }

        BigDecimal percCrescimentoQtd = BigDecimal.ZERO;
        if (qtdVendasAnterior > 0) {
            percCrescimentoQtd = BigDecimal.valueOf(qtdVendasPeriodo - qtdVendasAnterior)
                    .divide(BigDecimal.valueOf(qtdVendasAnterior), 4, java.math.RoundingMode.HALF_UP)
                    .multiply(new BigDecimal("100"));
        } else if (qtdVendasPeriodo > 0) {
            percCrescimentoQtd = new BigDecimal("100");
        }

        DashboardMetricasDTO dto = new DashboardMetricasDTO(
                totalClientes,
                condicionaisAtivos,
                totalProdutos,
                totalVendasPeriodo,
                qtdVendasPeriodo,
                totalVendasAnterior,
                qtdVendasAnterior,
                percCrescimentoValor,
                percCrescimentoQtd);
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/grafico")
    public ResponseEntity<List<com.adudasena.mmsystem.dto.GraficoPontoDTO>> obterDadosGrafico(
            @RequestParam(required = false) String dataInicio,
            @RequestParam(required = false) String dataFim) {

        LocalDate inicio;
        try {
            inicio = (dataInicio != null && !dataInicio.isBlank())
                    ? LocalDate.parse(dataInicio.trim())
                    : LocalDate.now().withDayOfMonth(1);
        } catch (Exception e) {
            inicio = LocalDate.now().withDayOfMonth(1);
        }

        LocalDate fim;
        try {
            fim = (dataFim != null && !dataFim.isBlank())
                    ? LocalDate.parse(dataFim.trim())
                    : LocalDate.now();
        } catch (Exception e) {
            fim = LocalDate.now();
        }

        if (inicio.isAfter(LocalDate.now())) {
            inicio = LocalDate.now();
        }

        if (fim.isBefore(inicio)) {
            fim = inicio;
        }

        List<com.adudasena.mmsystem.dto.GraficoPontoDTO> pontos = new java.util.ArrayList<>();
        long totalDias = java.time.temporal.ChronoUnit.DAYS.between(inicio, fim) + 1;

        try {
            List<Pedido> pedidos = pedidoRepository.findAll();
            List<Pedido> pedidosValidos = pedidos != null ? pedidos.stream()
                    .filter(p -> p != null && p.getStatus() != StatusPedido.CANCELADO && p.getDeletedAt() == null)
                    .toList() : Collections.emptyList();

            if (totalDias <= 31) {
                // Agrupar DIA a DIA
                for (LocalDate d = inicio; !d.isAfter(fim); d = d.plusDays(1)) {
                    final LocalDate diaAtual = d;
                    List<Pedido> pedidosDoDia = pedidosValidos.stream()
                            .filter(p -> p.getDataPedido() != null && p.getDataPedido().equals(diaAtual))
                            .toList();

                    BigDecimal fat = pedidosDoDia.stream()
                            .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    String label = String.format("%02d/%02d", d.getDayOfMonth(), d.getMonthValue());
                    pontos.add(new com.adudasena.mmsystem.dto.GraficoPontoDTO(label, d.toString(), fat, pedidosDoDia.size()));
                }
            } else {
                // Agrupar MES a MES
                java.time.YearMonth ymInicio = java.time.YearMonth.from(inicio);
                java.time.YearMonth ymFim = java.time.YearMonth.from(fim);

                for (java.time.YearMonth ym = ymInicio; !ym.isAfter(ymFim); ym = ym.plusMonths(1)) {
                    final java.time.YearMonth currentYM = ym;
                    List<Pedido> pedidosDoMes = pedidosValidos.stream()
                            .filter(p -> p.getDataPedido() != null && java.time.YearMonth.from(p.getDataPedido()).equals(currentYM))
                            .toList();

                    BigDecimal fat = pedidosDoMes.stream()
                            .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    String label = String.format("%02d/%04d", ym.getMonthValue(), ym.getYear());
                    pontos.add(new com.adudasena.mmsystem.dto.GraficoPontoDTO(label, ym.toString(), fat, pedidosDoMes.size()));
                }
            }

        } catch (Exception e) {
            logger.error("Erro ao gerar dados do gráfico do dashboard: ", e);
        }

        return ResponseEntity.ok(pontos);
    }
}
