package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.ProdutoDTO;
import com.adudasena.mmsystem.model.Produto;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@lombok.RequiredArgsConstructor
public class ProdutoService {

    private final ProdutoRepository repository;

    private final ObjectMapper objectMapper;

    private final CondicionalRepository condicionalRepository;

    public List<Produto> listarTodos() {
        return repository.findByDeletedAtIsNull();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public java.util.List<com.adudasena.mmsystem.dto.ProdutoOpcaoDTO> listarOpcoes() {
        return repository.findByDeletedAtIsNull().stream()
                .map(com.adudasena.mmsystem.dto.ProdutoOpcaoDTO::from)
                .toList();
    }

    public Produto buscarPorId(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado com o ID: " + id));
    }

    public Produto salvar(ProdutoDTO dto) throws JsonProcessingException {

      Produto teste = salvar(new Produto(), dto);
        return teste;
    }

    public Produto atualizar(Long id, ProdutoDTO dto) throws JsonProcessingException {
        Produto existente = buscarPorId(id);
        return salvar(existente, dto);
    }

    @org.springframework.transaction.annotation.Transactional
    public void excluir(Long id) {
        if (condicionalRepository.existsSacolaAbertaComProduto(id)) {
            throw new RuntimeException("Não é possível excluir este produto pois ele está vinculado a uma sacola condicional ativa em andamento.");
        }

        Produto produto = buscarPorId(id);
        produto.setDeletedAt(LocalDateTime.now());
        repository.save(produto);
    }

    public Page<Produto> listarTodos(Pageable pageable) {
        return repository.findByDeletedAtIsNull(pageable);
    }

    public Page<Produto> listarVitrine(Pageable pageable, String categoria) {
        if (categoria != null && !categoria.isBlank()) {
            return repository.findByDeletedAtIsNullAndStatusIgnoreCaseAndCategoriaIgnoreCase(
                    "DISPONIVEL", categoria.trim(), pageable);
        }
        return repository.findByDeletedAtIsNullAndStatusIgnoreCase("DISPONIVEL", pageable);
    }

    public List<String> listarCategoriasVitrine() {
        return repository.listarCategoriasVitrine();
    }

    public List<String> listarCategoriasEmUso() {
        return repository.listarCategoriasEmUso();
    }

    // Listar apenas o que está na lixeira
    public List<Produto> listarExcluidos() {
        return repository.findByDeletedAtIsNotNull();
    }

    public void restaurar(Long id) {
        Produto produto = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produto não encontrado com o ID: " + id));
        produto.setDeletedAt(null);
        repository.save(produto);
    }

    private Produto salvar(Produto produto, ProdutoDTO dto) throws JsonProcessingException {
        produto.setNome(dto.getNome());
        produto.setDescricao(dto.getDescricao());
        produto.setPreco(dto.getPreco());
        produto.setCategoria(dto.getCategoria()); // essa linha precisa estar aqui
        produto.setStatus(dto.getStatus() != null ? dto.getStatus().toUpperCase() : "DISPONIVEL");
        produto.setCoresText(objectMapper.writeValueAsString(dto.getCoresSelecionadas()));
        produto.setTamanhosText(objectMapper.writeValueAsString(dto.getTamanhosSelecionados()));
        produto.setEstoqueDetalhado(objectMapper.writeValueAsString(dto.getEstoqueDetalhado()));
        produto.setFotos(objectMapper.writeValueAsString(dto.getFotos()));
        return repository.save(produto);
    }


}