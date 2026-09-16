package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.model.*;
import com.adudasena.mmsystem.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atributos")
@CrossOrigin(origins = "*")
@lombok.RequiredArgsConstructor
public class AtributoProdutoController {

    private final CategoriaRepository categoriaRepository;
    private final TamanhoRepository tamanhoRepository;
    private final CorRepository corRepository;

    @GetMapping("/categorias")
    public ResponseEntity<List<Categoria>> listarCategorias() { return ResponseEntity.ok(categoriaRepository.findAll()); }

    @PostMapping("/categorias")
    public ResponseEntity<Categoria> criarCategoria(@RequestBody Categoria categoria) { return ResponseEntity.status(HttpStatus.CREATED).body(categoriaRepository.save(categoria)); }

    @GetMapping("/tamanhos")
    public ResponseEntity<List<Tamanho>> listarTamanhos() { return ResponseEntity.ok(tamanhoRepository.findAll()); }

    @PostMapping("/tamanhos")
    public ResponseEntity<Tamanho> criarTamanho(@RequestBody Tamanho tamanho) { return ResponseEntity.status(HttpStatus.CREATED).body(tamanhoRepository.save(tamanho)); }

    @GetMapping("/cores")
    public ResponseEntity<List<Cor>> listarCores() { return ResponseEntity.ok(corRepository.findAll()); }

    @PostMapping("/cores")
    public ResponseEntity<Cor> criarCor(@RequestBody Cor cor) { return ResponseEntity.status(HttpStatus.CREATED).body(corRepository.save(cor)); }
}