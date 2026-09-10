package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.model.Condicional;
import com.adudasena.mmsystem.service.CondicionalService;
import com.adudasena.mmsystem.dto.PedidoDTO;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.service.PedidoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/pedidos")
@CrossOrigin(origins = "*")
public class PedidoController {

    @Autowired
    private PedidoService service;

    @Autowired
    private CondicionalService condicionalService;

    @PostMapping("/vitrine")
    public ResponseEntity<Condicional> criarPedidoVitrine(@RequestBody VitrinePedidoDTO dto) {
        Condicional condicionalCriada = condicionalService.processarPedidoVitrine(dto);
        return ResponseEntity.status(201).body(condicionalCriada);
    }

    @GetMapping
    public ResponseEntity<Page<Pedido>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pedido> buscarPorId(@PathVariable Long id) {
        Pedido pedido = service.buscarPorId(id);
        if (pedido == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pedido);
    }

    @PostMapping
    public ResponseEntity<Pedido> salvar(@RequestBody PedidoDTO dto) {
        Pedido novoPedido = service.salvar(dto);
        return ResponseEntity.status(201).body(novoPedido);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pedido> atualizar(@PathVariable Long id, @RequestBody PedidoDTO dto) {
        Pedido pedidoAtualizado = service.atualizar(id, dto);
        if (pedidoAtualizado == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pedidoAtualizado);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Pedido> atualizarStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String novoStatus = body.get("status");
        Pedido pedidoAtualizado = service.atualizarStatus(id, novoStatus);
        if (pedidoAtualizado == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(pedidoAtualizado);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        boolean deletado = service.excluir(id);
        if (!deletado) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.noContent().build();
    }
}