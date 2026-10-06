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

import java.util.List;

@Service
@RequiredArgsConstructor
public class AtributoProdutoService {

    private final CategoriaRepository categoriaRepository;
    private final TamanhoRepository tamanhoRepository;
    private final CorRepository corRepository;

    @Transactional(readOnly = true)
    public List<AtributoResponseDTO> listarCategorias() {
        return categoriaRepository.findAll().stream()
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

    @Transactional(readOnly = true)
    public List<AtributoResponseDTO> listarTamanhos() {
        return tamanhoRepository.findAll().stream()
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

    @Transactional(readOnly = true)
    public List<AtributoResponseDTO> listarCores() {
        return corRepository.findAll().stream()
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
}
