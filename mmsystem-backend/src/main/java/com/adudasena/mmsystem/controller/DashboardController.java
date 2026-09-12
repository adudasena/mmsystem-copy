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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DashboardController {

    private static final Logger logger = LoggerFactory.getLogger(DashboardController.class);

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CondicionalRepository condicionalRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @GetMapping("/metricas")
    public ResponseEntity<DashboardMetricasDTO> obterMetricas() {
        long totalClientes = 0;
        long condicionaisAtivos = 0;
        long totalProdutos = 0;
        BigDecimal totalVendasMes = BigDecimal.ZERO;
        BigDecimal totalVendasHoje = BigDecimal.ZERO;
        long qtdVendasMes = 0;
        long qtdVendasHoje = 0;

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
                    .filter(c -> "ABERTA".equalsIgnoreCase(c.getStatus()) || "EM_CONDICIONAL".equalsIgnoreCase(c.getStatus()))
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

        try {
            LocalDate hoje = LocalDate.now();
            List<Pedido> pedidos = pedidoRepository.findAll();

            List<Pedido> pedidosValidos = pedidos != null ? pedidos.stream()
                    .filter(p -> p != null && p.getStatus() != StatusPedido.CANCELADO)
                    .toList() : Collections.emptyList();

            List<Pedido> pedidosHoje = pedidosValidos.stream()
                    .filter(p -> p.getDataPedido() != null && p.getDataPedido().isEqual(hoje))
                    .toList();

            List<Pedido> pedidosMes = pedidosValidos.stream()
                    .filter(p -> p.getDataPedido() != null && 
                            p.getDataPedido().getYear() == hoje.getYear() && 
                            p.getDataPedido().getMonth() == hoje.getMonth())
                    .toList();

            totalVendasHoje = pedidosHoje.stream()
                    .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            totalVendasMes = pedidosMes.stream()
                    .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            qtdVendasHoje = pedidosHoje.size();
            qtdVendasMes = pedidosMes.size();
        } catch (Exception e) {
            logger.error("Erro ao calcular vendas do dashboard: ", e);
        }

        DashboardMetricasDTO dto = new DashboardMetricasDTO(
                totalClientes,
                condicionaisAtivos,
                totalProdutos,
                totalVendasMes,
                totalVendasHoje,
                qtdVendasMes,
                qtdVendasHoje
        );
        return ResponseEntity.ok(dto);
    }
}


