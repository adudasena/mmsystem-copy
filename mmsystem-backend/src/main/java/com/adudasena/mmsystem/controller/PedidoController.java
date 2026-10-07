package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.PedidoDTO;
import com.adudasena.mmsystem.dto.PedidoResponseDTO;
import com.adudasena.mmsystem.dto.StatusPatchDTO;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.service.PedidoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService service;

    @GetMapping
    public ResponseEntity<Page<PedidoResponseDTO>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable).map(PedidoResponseDTO::from));
    }

    @GetMapping("/excluidos")
    public ResponseEntity<Page<PedidoResponseDTO>> listarExcluidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarExcluidos(pageable).map(PedidoResponseDTO::from));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PedidoResponseDTO> buscarPorId(@PathVariable Long id) {
        Pedido pedido = service.buscarPorId(id);
        if (pedido == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(PedidoResponseDTO.from(pedido));
    }

    @PostMapping
    public ResponseEntity<PedidoResponseDTO> salvar(@Valid @RequestBody PedidoDTO dto) {
        return ResponseEntity.status(201).body(PedidoResponseDTO.from(service.salvar(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PedidoResponseDTO> atualizar(@PathVariable Long id, @Valid @RequestBody PedidoDTO dto) {
        Pedido pedidoAtualizado = service.atualizar(id, dto);
        if (pedidoAtualizado == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(PedidoResponseDTO.from(pedidoAtualizado));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<PedidoResponseDTO> atualizarStatus(@PathVariable Long id, @Valid @RequestBody StatusPatchDTO body) {
        Pedido pedidoAtualizado = service.atualizarStatus(id, body.status());
        if (pedidoAtualizado == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(PedidoResponseDTO.from(pedidoAtualizado));
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
}
