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

        LocalDate inicio = dataInicio != null ? LocalDate.parse(dataInicio) : LocalDate.now().withDayOfMonth(1);
        LocalDate fim = dataFim != null ? LocalDate.parse(dataFim) : LocalDate.now();

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
            List<Pedido> pedidosNoPeriodo = pedidosValidos.stream()
                    .filter(p -> p.getDataPedido() != null && !p.getDataPedido().isBefore(inicio)
                            && !p.getDataPedido().isAfter(fim))
                    .toList();

            totalVendasPeriodo = pedidosNoPeriodo.stream()
                    .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            qtdVendasPeriodo = pedidosNoPeriodo.size();

            // Período anterior
            List<Pedido> pedidosNoPeriodoAnterior = pedidosValidos.stream()
                    .filter(p -> p.getDataPedido() != null && !p.getDataPedido().isBefore(inicioAnterior)
                            && !p.getDataPedido().isAfter(fimAnterior))
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
}
