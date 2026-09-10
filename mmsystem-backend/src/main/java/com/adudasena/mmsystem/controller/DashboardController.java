package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.DashboardMetricasDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @GetMapping("/metricas")
    public ResponseEntity<DashboardMetricasDTO> obterMetricas() {
        long totalClientes = usuarioRepository.findByDeletedAtIsNull().stream()
                .filter(u -> u.getPerfil() == Perfil.ROLE_CLIENTE)
                .count();

        long condicionaisAtivos = condicionalRepository.findByDeletedAtIsNull().stream()
                .filter(c -> "ABERTA".equalsIgnoreCase(c.getStatus()) || "EM_CONDICIONAL".equalsIgnoreCase(c.getStatus()))
                .count();

        long totalProdutos = produtoRepository.findByDeletedAtIsNull().size();

        DashboardMetricasDTO dto = new DashboardMetricasDTO(totalClientes, condicionaisAtivos, totalProdutos);
        return ResponseEntity.ok(dto);
    }
}
