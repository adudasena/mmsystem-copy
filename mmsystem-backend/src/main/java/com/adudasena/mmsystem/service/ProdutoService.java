package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.ProdutoDTO;
import com.adudasena.mmsystem.model.Condicional;
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
public class ProdutoService {

    @Autowired
    private ProdutoRepository repository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CondicionalRepository condicionalRepository;

    public List<Produto> listarTodos() {
        return repository.findByDeletedAtIsNull();
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

    public void excluir(Long id) {
        // Busca as condicionais do sistema que não sofreram soft delete
        List<Condicional> condicionaisAtivas = condicionalRepository.findByDeletedAtIsNull();

        // Varre os itens guardados na memória para ver se o ID do produto está lá
        boolean emUso = condicionaisAtivas.stream()
                .filter(c -> "ABERTA".equals(c.getStatus())) // Filtra só as sacolas abertas
                .filter(c -> c.getItens() != null)           // Evita NullPointerException se a lista de itens for nula
                .flatMap(c -> c.getItens().stream())         // Entra na lista de itens
                .filter(item -> item.getProduto() != null)   // Evita NullPointerException se o produto dentro do item estiver nulo
                .anyMatch(item -> id.equals(item.getProduto().getId())); // Acessa o ID do produto pelo objeto

        // Se o produto estiver em alguma sacola aberta, impede a exclusão
        if (emUso) {
            throw new RuntimeException("Não é possível excluir este produto pois ele está vinculado a uma sacola condicional ativa em andamento.");
        }

        // Se estiver tudo limpo, aplica o Soft Delete normalmente
        Produto produto = buscarPorId(id);
        produto.setDeletedAt(LocalDateTime.now());
        repository.save(produto);
    }

    public Page<Produto> listarTodos(Pageable pageable) {
        return repository.findByDeletedAtIsNull(pageable);
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