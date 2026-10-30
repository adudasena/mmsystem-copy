package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.model.Produto;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProdutoExcluirTest {

    @Mock
    private ProdutoRepository produtoRepository;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private CondicionalRepository condicionalRepository;

    @InjectMocks
    private ProdutoService service;

    @Test
    void bloqueiaQuandoHaSacolaAbertaComOProduto() {
        when(condicionalRepository.existsSacolaAbertaComProduto(10L)).thenReturn(true);

        RuntimeException erro = assertThrows(RuntimeException.class, () -> service.excluir(10L));
        org.junit.jupiter.api.Assertions.assertTrue(erro.getMessage().contains("sacola condicional ativa"));
        verify(produtoRepository, never()).save(any());
    }

    @Test
    void permiteQuandoNaoHaSacolaAberta() {
        Produto produto = new Produto();
        produto.setId(10L);
        when(condicionalRepository.existsSacolaAbertaComProduto(10L)).thenReturn(false);
        when(produtoRepository.findByIdAndDeletedAtIsNull(10L)).thenReturn(Optional.of(produto));

        service.excluir(10L);

        assertNotNull(produto.getDeletedAt());
        verify(produtoRepository).save(produto);
    }
}
