package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.ProdutoDTO;
import com.adudasena.mmsystem.dto.ProdutoResponseDTO;
import com.adudasena.mmsystem.service.ProdutoService;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/produtos")
@RequiredArgsConstructor
public class ProdutoController {

    private final ProdutoService service;

    @GetMapping
    public ResponseEntity<Page<ProdutoResponseDTO>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable).map(ProdutoResponseDTO::from));
    }

    @GetMapping("/excluidos")
    public List<ProdutoResponseDTO> listarExcluidos() {
        return service.listarExcluidos().stream().map(ProdutoResponseDTO::from).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProdutoResponseDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ProdutoResponseDTO.from(service.buscarPorId(id)));
    }

    @PostMapping
    public ResponseEntity<ProdutoResponseDTO> salvar(@Valid @RequestBody ProdutoDTO dto) throws JsonProcessingException {
        return ResponseEntity.ok(ProdutoResponseDTO.from(service.salvar(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProdutoResponseDTO> editar(@PathVariable Long id, @Valid @RequestBody ProdutoDTO dto)
            throws JsonProcessingException {
        return ResponseEntity.ok(ProdutoResponseDTO.from(service.atualizar(id, dto)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restaurar")
    public ResponseEntity<Void> restaurar(@PathVariable Long id) {
        service.restaurar(id);
        return ResponseEntity.noContent().build();
    }
}
