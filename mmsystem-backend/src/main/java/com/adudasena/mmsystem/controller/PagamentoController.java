package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.PagamentoDTO;
import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.service.PagamentoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/pagamentos")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class PagamentoController {

    private final PagamentoService service;

    @GetMapping
    public ResponseEntity<Page<Pagamento>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable));
    }

    @GetMapping("/excluidos")
    public ResponseEntity<Page<Pagamento>> listarExcluidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarExcluidos(pageable));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pagamento> atualizar(@PathVariable Long id, @RequestBody PagamentoDTO dto) {
        Pagamento pagamentoAtualizado = service.atualizar(id, dto);
        if (pagamentoAtualizado == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pagamentoAtualizado);
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
    public ResponseEntity<Pagamento> salvar(@RequestBody PagamentoDTO dto) {
        Pagamento salvo = service.salvar(dto);
        return ResponseEntity.status(201).body(salvo);
    }
}