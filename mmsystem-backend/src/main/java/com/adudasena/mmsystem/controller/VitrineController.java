package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.model.Condicional;
import com.adudasena.mmsystem.service.CondicionalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/vitrine")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@lombok.RequiredArgsConstructor
public class VitrineController {

    private final CondicionalService condicionalService;

    @PostMapping("/pedido")
    public ResponseEntity<Condicional> criarPedidoVitrine(@RequestBody VitrinePedidoDTO dto) {
        // Converte o pedido da vitrine direto em uma sacola condicional no banco
        Condicional condicionalCriada = condicionalService.processarPedidoVitrine(dto);
        return ResponseEntity.status(201).body(condicionalCriada);
    }
}