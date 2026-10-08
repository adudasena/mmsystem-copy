package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.UsuarioDTO;
import com.adudasena.mmsystem.dto.UsuarioResponseDTO;
import com.adudasena.mmsystem.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/usuarios")
@lombok.RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService service;

    @GetMapping("/me")
    public ResponseEntity<java.util.Map<String, Object>> eu() {
        var u = service.usuarioLogadoOuErro();
        return ResponseEntity.ok(java.util.Map.of(
                "id", u.getId(),
                "nome", u.getNome(),
                "email", u.getEmail() != null ? u.getEmail() : "",
                "perfil", u.getPerfil() != null ? u.getPerfil().name() : "",
                "guiaProdutoVisto", u.isGuiaProdutoVisto()
        ));
    }

    @PatchMapping("/me/guia-produto")
    public ResponseEntity<java.util.Map<String, Object>> marcarGuiaProduto() {
        var u = service.marcarGuiaProdutoVisto();
        return ResponseEntity.ok(java.util.Map.of("guiaProdutoVisto", u.isGuiaProdutoVisto()));
    }

    @GetMapping
    public ResponseEntity<Page<UsuarioResponseDTO>> listarTodos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarTodos(pageable).map(UsuarioResponseDTO::from));
    }

    @GetMapping("/excluidos")
    public ResponseEntity<Page<UsuarioResponseDTO>> listarExcluidos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(service.listarExcluidos(pageable).map(UsuarioResponseDTO::from));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(UsuarioResponseDTO.from(service.buscarPorId(id)));
    }

    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> salvar(@Valid @RequestBody UsuarioDTO dto) {
        return ResponseEntity.status(201).body(UsuarioResponseDTO.from(service.salvar(dto)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> atualizar(@PathVariable Long id, @Valid @RequestBody UsuarioDTO dto) {
        return ResponseEntity.ok(UsuarioResponseDTO.from(service.atualizar(id, dto)));
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
