package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.AvisosVencimentoResultadoDTO;
import com.adudasena.mmsystem.service.AvisosVencimentoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/avisos")
@RequiredArgsConstructor
public class AvisosVencimentoController {

    private final AvisosVencimentoService avisosVencimentoService;

    @PostMapping("/vencimento")
    public ResponseEntity<AvisosVencimentoResultadoDTO> dispararAgora() {
        return ResponseEntity.ok(avisosVencimentoService.processarAvisosDoDia());
    }
}
