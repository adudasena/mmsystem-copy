package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.DashboardMetricasDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.PedidoRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/dashboard")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DashboardController {

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
        long totalClientes = usuarioRepository.findByDeletedAtIsNull().stream()
                .filter(u -> u.getPerfil() == Perfil.ROLE_CLIENTE)
                .count();

        long condicionaisAtivos = condicionalRepository.findByDeletedAtIsNull().stream()
                .filter(c -> "ABERTA".equalsIgnoreCase(c.getStatus()) || "EM_CONDICIONAL".equalsIgnoreCase(c.getStatus()))
                .count();

        long totalProdutos = produtoRepository.findByDeletedAtIsNull().size();

        LocalDate hoje = LocalDate.now();
        List<Pedido> pedidos = pedidoRepository.findAll();

        List<Pedido> pedidosValidos = pedidos.stream()
                .filter(p -> p.getStatus() != StatusPedido.CANCELADO)
                .toList();

        List<Pedido> pedidosHoje = pedidosValidos.stream()
                .filter(p -> p.getDataPedido() != null && p.getDataPedido().isEqual(hoje))
                .toList();

        List<Pedido> pedidosMes = pedidosValidos.stream()
                .filter(p -> p.getDataPedido() != null && 
                        p.getDataPedido().getYear() == hoje.getYear() && 
                        p.getDataPedido().getMonth() == hoje.getMonth())
                .toList();

        BigDecimal totalVendasHoje = pedidosHoje.stream()
                .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalVendasMes = pedidosMes.stream()
                .map(p -> p.getValorTotal() != null ? p.getValorTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        DashboardMetricasDTO dto = new DashboardMetricasDTO(
                totalClientes,
                condicionaisAtivos,
                totalProdutos,
                totalVendasMes,
                totalVendasHoje,
                pedidosMes.size(),
                pedidosHoje.size()
        );
        return ResponseEntity.ok(dto);
    }
}

