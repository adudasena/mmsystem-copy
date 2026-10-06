package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.CondicionalDTO;
import com.adudasena.mmsystem.dto.CondicionalResponseDTO;
import com.adudasena.mmsystem.service.CondicionalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/condicionais")
@RequiredArgsConstructor
public class CondicionalController {

    private final CondicionalService service;

    @GetMapping
    public ResponseEntity<Page<CondicionalResponseDTO>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable).map(CondicionalResponseDTO::from));
    }

    @GetMapping("/excluidos")
    public ResponseEntity<Page<CondicionalResponseDTO>> listarExcluidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarExcluidos(pageable).map(CondicionalResponseDTO::from));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CondicionalResponseDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(CondicionalResponseDTO.from(service.buscarPorId(id)));
    }

    @PostMapping
    public ResponseEntity<CondicionalResponseDTO> criar(@Valid @RequestBody CondicionalDTO dto) {
        return ResponseEntity.status(201).body(CondicionalResponseDTO.from(service.criar(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CondicionalResponseDTO> atualizar(@PathVariable Long id,
                                                            @Valid @RequestBody CondicionalDTO dto) {
        return ResponseEntity.ok(CondicionalResponseDTO.from(service.atualizar(id, dto)));
    }

    @PutMapping("/{id}/finalizar")
    public ResponseEntity<CondicionalResponseDTO> finalizar(@PathVariable Long id,
                                                            @Valid @RequestBody CondicionalDTO dto) {
        return ResponseEntity.ok(CondicionalResponseDTO.from(service.finalizar(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restaurar")
    public ResponseEntity<Void> restaurar(@PathVariable Long id) {
        service.restaurar(id);
        return ResponseEntity.ok().build();
    }
}
