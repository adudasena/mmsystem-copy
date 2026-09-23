package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.model.Condicional;
import com.adudasena.mmsystem.model.Produto;
import com.adudasena.mmsystem.service.CondicionalService;
import com.adudasena.mmsystem.service.ProdutoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/vitrine")
@lombok.RequiredArgsConstructor
public class VitrineController {

    private final CondicionalService condicionalService;
    private final ProdutoService produtoService;

    @GetMapping("/produtos")
    public ResponseEntity<Page<Produto>> listarCatalogo(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("id").descending());
        return ResponseEntity.ok(produtoService.listarVitrine(pageable));
    }

    @PostMapping("/pedido")
    public ResponseEntity<Condicional> criarPedidoVitrine(@RequestBody VitrinePedidoDTO dto) {
        Condicional condicionalCriada = condicionalService.processarPedidoVitrine(dto);
        return ResponseEntity.status(201).body(condicionalCriada);
    }
}
