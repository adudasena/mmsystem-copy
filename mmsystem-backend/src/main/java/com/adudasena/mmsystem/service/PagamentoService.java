package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.PagamentoDTO;
import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.enums.StatusPagamento;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.repository.PagamentoRepository;
import com.adudasena.mmsystem.repository.PedidoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@lombok.RequiredArgsConstructor
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;

    private final PedidoRepository pedidoRepository;

    @Transactional(readOnly = true)
    public List<String> opcoesFiltroStatus() {
        Set<String> opcoes = new LinkedHashSet<>();
        for (StatusPagamento status : pagamentoRepository.listarStatusAtivos()) {
            if (status == StatusPagamento.PAGO) {
                opcoes.add("APROVADO");
            } else {
                opcoes.add(status.name());
            }
        }
        return new ArrayList<>(opcoes);
    }

    @Transactional(readOnly = true)
    public Page<Pagamento> listarTodos(Pageable pageable) {
        return pagamentoRepository.findByDeletedAtIsNull(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Pagamento> listarExcluidos(Pageable pageable) {
        return pagamentoRepository.findByDeletedAtIsNotNull(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Pagamento> listarFiadosVencidos(Pageable pageable) {
        return pagamentoRepository.findByDeletedAtIsNullAndStatusAndMetodoPagamentoAndDataVencimentoLessThanEqual(
                StatusPagamento.PENDENTE,
                MetodoPagamento.PAGAMENTO_FUTURO,
                java.time.LocalDate.now(),
                pageable
        );
    }

    @Transactional(readOnly = true)
    public long contarFiadosVencidos() {
        return pagamentoRepository.countByDeletedAtIsNullAndStatusAndMetodoPagamentoAndDataVencimentoLessThanEqual(
                StatusPagamento.PENDENTE,
                MetodoPagamento.PAGAMENTO_FUTURO,
                java.time.LocalDate.now()
        );
    }

    @Transactional(readOnly = true)
    public Pagamento buscarPorId(Long id) {
        return pagamentoRepository.findById(id)
                .filter(p -> p.getDeletedAt() == null)
                .orElse(null);
    }

    @Transactional
    public Pagamento salvar(PagamentoDTO dto) {
        Pagamento pagamento = new Pagamento();
        preencherDadosPagamento(pagamento, dto);
        Pagamento salvo = pagamentoRepository.save(pagamento);
        sincronizarPedido(salvo);
        return salvo;
    }

    @Transactional
    public Pagamento atualizar(Long id, PagamentoDTO dto) {
        Pagamento pagamentoExistente = buscarPorId(id);
        if (pagamentoExistente == null) {
            return null;
        }
        preencherDadosPagamento(pagamentoExistente, dto);
        Pagamento salvo = pagamentoRepository.save(pagamentoExistente);
        sincronizarPedido(salvo);
        return salvo;
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
        
        if (dto.getStatus() != null) {
            try {
                pagamento.setStatus(StatusPagamento.valueOf(dto.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                pagamento.setStatus(StatusPagamento.PENDENTE);
            }
        } else {
            pagamento.setStatus(StatusPagamento.PENDENTE);
        }

        if (dto.getMetodoPagamento() != null) {
            try {
                pagamento.setMetodoPagamento(MetodoPagamento.valueOf(dto.getMetodoPagamento().toUpperCase()));
            } catch (IllegalArgumentException e) {
                pagamento.setMetodoPagamento(MetodoPagamento.PIX);
            }
        }

        if (pagamento.getMetodoPagamento() == MetodoPagamento.CARTAO_CREDITO) {
            int parcelas = dto.getParcelas() != null ? dto.getParcelas() : 1;
            if (parcelas < 1 || parcelas > 12) {
                throw new IllegalArgumentException("Informe de 1 a 12 parcelas no cartão de crédito.");
            }
            pagamento.setParcelas(parcelas);
        } else {
            pagamento.setParcelas(null);
        }

        if (dto.getFkPedidoId() != null) {
            Pedido pedido = pedidoRepository.findById(dto.getFkPedidoId()).orElse(null);
            pagamento.setPedido(pedido);
        } else {
            pagamento.setPedido(null);
        }
    }

    private void sincronizarPedido(Pagamento pagamento) {
        if (pagamento.getPedido() != null && pagamento.getStatus() != null) {
            Pedido pedido = pagamento.getPedido();
            switch (pagamento.getStatus()) {
                case PENDENTE:
                    pedido.setStatus(StatusPedido.AGUARDANDO_PAGAMENTO);
                    break;
                case APROVADO:
                    pedido.setStatus(StatusPedido.CONCLUIDO);
                    break;
                case CANCELADO:
                case ESTORNADO:
                    pedido.setStatus(StatusPedido.CANCELADO);
                    break;
            }
            pedidoRepository.save(pedido);
        }
    }
}