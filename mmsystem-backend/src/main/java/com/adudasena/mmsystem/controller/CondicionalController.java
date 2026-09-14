package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.CondicionalDTO;
import com.adudasena.mmsystem.model.Condicional;
import com.adudasena.mmsystem.service.CondicionalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/condicionais")
@CrossOrigin("*")
public class CondicionalController {

    @Autowired
    private CondicionalService service;

    @GetMapping
    public ResponseEntity<Page<Condicional>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable));
    }

    @GetMapping("/excluidos")
    public ResponseEntity<Page<Condicional>> listarExcluidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarExcluidos(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Condicional> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<Condicional> criar(@RequestBody CondicionalDTO dto) {
        return ResponseEntity.status(201).body(service.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Condicional> atualizar(@PathVariable Long id,
                                                 @RequestBody CondicionalDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    // Ajustado para receber o DTO com a lista vinda do Front-end
    @PutMapping("/{id}/finalizar")
    public ResponseEntity<Condicional> finalizar(@PathVariable Long id,
                                                 @RequestBody CondicionalDTO dto) {
        return ResponseEntity.ok(service.finalizar(id, dto));
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