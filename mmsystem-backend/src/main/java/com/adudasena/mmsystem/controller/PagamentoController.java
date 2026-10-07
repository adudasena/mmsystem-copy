package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.PagamentoDTO;
import com.adudasena.mmsystem.dto.PagamentoResponseDTO;
import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.service.PagamentoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/pagamentos")
@RequiredArgsConstructor
public class PagamentoController {

    private final PagamentoService service;

    @GetMapping
    public ResponseEntity<Page<PagamentoResponseDTO>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable).map(PagamentoResponseDTO::from));
    }

    @GetMapping("/vencidos")
    public ResponseEntity<Page<PagamentoResponseDTO>> listarFiadosVencidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("dataVencimento").ascending());
        return ResponseEntity.ok(service.listarFiadosVencidos(pageable).map(PagamentoResponseDTO::from));
    }

    @GetMapping("/excluidos")
    public ResponseEntity<Page<PagamentoResponseDTO>> listarExcluidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarExcluidos(pageable).map(PagamentoResponseDTO::from));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PagamentoResponseDTO> atualizar(@PathVariable Long id, @Valid @RequestBody PagamentoDTO dto) {
        Pagamento pagamentoAtualizado = service.atualizar(id, dto);
        if (pagamentoAtualizado == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(PagamentoResponseDTO.from(pagamentoAtualizado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        boolean deletado = service.excluir(id);
        if (!deletado) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/restaurar")
    public ResponseEntity<Void> restaurar(@PathVariable Long id) {
        boolean restaurado = service.restaurar(id);
        if (!restaurado) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping
    public ResponseEntity<PagamentoResponseDTO> salvar(@Valid @RequestBody PagamentoDTO dto) {
        Pagamento salvo = service.salvar(dto);
        return ResponseEntity.status(201).body(PagamentoResponseDTO.from(salvo));
    }
}
