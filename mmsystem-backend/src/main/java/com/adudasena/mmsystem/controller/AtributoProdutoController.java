package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.AtributoRequestDTO;
import com.adudasena.mmsystem.dto.AtributoResponseDTO;
import com.adudasena.mmsystem.service.AtributoProdutoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atributos")
@RequiredArgsConstructor
public class AtributoProdutoController {

    private final AtributoProdutoService service;

    @GetMapping("/categorias")
    public ResponseEntity<List<AtributoResponseDTO>> listarCategorias() {
        return ResponseEntity.ok(service.listarCategorias());
    }

    @PostMapping("/categorias")
    public ResponseEntity<AtributoResponseDTO> criarCategoria(@Valid @RequestBody AtributoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criarCategoria(dto));
    }

    @GetMapping("/tamanhos")
    public ResponseEntity<List<AtributoResponseDTO>> listarTamanhos() {
        return ResponseEntity.ok(service.listarTamanhos());
    }

    @PostMapping("/tamanhos")
    public ResponseEntity<AtributoResponseDTO> criarTamanho(@Valid @RequestBody AtributoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criarTamanho(dto));
    }

    @GetMapping("/cores")
    public ResponseEntity<List<AtributoResponseDTO>> listarCores() {
        return ResponseEntity.ok(service.listarCores());
    }

    @PostMapping("/cores")
    public ResponseEntity<AtributoResponseDTO> criarCor(@Valid @RequestBody AtributoRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criarCor(dto));
    }
}
