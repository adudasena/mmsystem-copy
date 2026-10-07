package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.AtributoRequestDTO;
import com.adudasena.mmsystem.dto.AtributoResponseDTO;
import com.adudasena.mmsystem.model.Categoria;
import com.adudasena.mmsystem.model.Cor;
import com.adudasena.mmsystem.model.Tamanho;
import com.adudasena.mmsystem.repository.CategoriaRepository;
import com.adudasena.mmsystem.repository.CorRepository;
import com.adudasena.mmsystem.repository.TamanhoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AtributoProdutoService {

    private final CategoriaRepository categoriaRepository;
    private final TamanhoRepository tamanhoRepository;
    private final CorRepository corRepository;

    @Transactional(readOnly = true)
    public List<AtributoResponseDTO> listarCategorias() {
        return categoriaRepository.findByDeletedAtIsNull().stream()
                .map(c -> new AtributoResponseDTO(c.getId(), c.getNome(), null))
                .toList();
    }

    @Transactional
    public AtributoResponseDTO criarCategoria(AtributoRequestDTO dto) {
        Categoria categoria = new Categoria();
        categoria.setNome(dto.nome());
        Categoria salvo = categoriaRepository.save(categoria);
        return new AtributoResponseDTO(salvo.getId(), salvo.getNome(), null);
    }

    @Transactional
    public void excluirCategoria(Long id) {
        Categoria categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoria não encontrada."));
        categoria.setDeletedAt(LocalDateTime.now());
        categoriaRepository.save(categoria);
    }

    @Transactional(readOnly = true)
    public List<AtributoResponseDTO> listarTamanhos() {
        return tamanhoRepository.findByDeletedAtIsNull().stream()
                .map(t -> new AtributoResponseDTO(t.getId(), t.getNome(), null))
                .toList();
    }

    @Transactional
    public AtributoResponseDTO criarTamanho(AtributoRequestDTO dto) {
        Tamanho tamanho = new Tamanho();
        tamanho.setNome(dto.nome());
        Tamanho salvo = tamanhoRepository.save(tamanho);
        return new AtributoResponseDTO(salvo.getId(), salvo.getNome(), null);
    }

    @Transactional
    public void excluirTamanho(Long id) {
        Tamanho tamanho = tamanhoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tamanho não encontrado."));
        tamanho.setDeletedAt(LocalDateTime.now());
        tamanhoRepository.save(tamanho);
    }

    @Transactional(readOnly = true)
    public List<AtributoResponseDTO> listarCores() {
        return corRepository.findByDeletedAtIsNull().stream()
                .map(c -> new AtributoResponseDTO(c.getId(), c.getNome(), c.getHexCode()))
                .toList();
    }

    @Transactional
    public AtributoResponseDTO criarCor(AtributoRequestDTO dto) {
        Cor cor = new Cor();
        cor.setNome(dto.nome());
        cor.setHexCode(dto.hexCode());
        Cor salvo = corRepository.save(cor);
        return new AtributoResponseDTO(salvo.getId(), salvo.getNome(), salvo.getHexCode());
    }

    @Transactional
    public void excluirCor(Long id) {
        Cor cor = corRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cor não encontrada."));
        cor.setDeletedAt(LocalDateTime.now());
        corRepository.save(cor);
    }
}
