package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.PagamentoDTO;
import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.repository.PagamentoRepository;
import com.adudasena.mmsystem.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PagamentoService {

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Transactional(readOnly = true)
    public Page<Pagamento> listarTodos(Pageable pageable) {
        return pagamentoRepository.findByDeletedAtIsNull(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Pagamento> listarExcluidos(Pageable pageable) {
        return pagamentoRepository.findByDeletedAtIsNotNull(pageable);
    }

    @Transactional(readOnly = true)
    public Pagamento buscarPorId(Long id) {
        return pagamentoRepository.findById(id).orElse(null);
    }

    @Transactional
    public Pagamento salvar(PagamentoDTO dto) {
        Pagamento pagamento = new Pagamento();
        preencherDadosPagamento(pagamento, dto);
        return pagamentoRepository.save(pagamento);
    }

    @Transactional
    public Pagamento atualizar(Long id, PagamentoDTO dto) {
        Pagamento pagamentoExistente = buscarPorId(id);
        if (pagamentoExistente == null) {
            return null;
        }
        preencherDadosPagamento(pagamentoExistente, dto);
        return pagamentoRepository.save(pagamentoExistente);
    }

    @Transactional
    public boolean excluir(Long id) {
        Pagamento pag = pagamentoRepository.findById(id).orElse(null);
        if (pag != null) {
            pag.setDeletedAt(java.time.LocalDateTime.now());
            pagamentoRepository.save(pag);
            return true;
        }
        return false;
    }

    @Transactional
    public boolean restaurar(Long id) {
        Pagamento pag = pagamentoRepository.findById(id).orElse(null);
        if (pag != null) {
            pag.setDeletedAt(null);
            pagamentoRepository.save(pag);
            return true;
        }
        return false;
    }

    private void preencherDadosPagamento(Pagamento pagamento, PagamentoDTO dto) {
        pagamento.setValor(dto.getValor());
        pagamento.setDataVencimento(dto.getDataVencimento());
        pagamento.setStatus(dto.getStatus() != null ? dto.getStatus().toUpperCase() : "PENDENTE");

        if (dto.getMetodoPagamento() != null) {
            try {
                pagamento.setMetodoPagamento(MetodoPagamento.valueOf(dto.getMetodoPagamento().toUpperCase()));
            } catch (IllegalArgumentException e) {
                pagamento.setMetodoPagamento(MetodoPagamento.PIX);
            }
        }

        if (dto.getFkPedidoId() != null) {
            Pedido pedido = pedidoRepository.findById(dto.getFkPedidoId()).orElse(null);
            pagamento.setPedido(pedido);
        } else {
            pagamento.setPedido(null);
        }
    }
}