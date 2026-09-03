package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.ItemPedidoDTO;
import com.adudasena.mmsystem.dto.PedidoDTO;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.ItemPedido;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.model.Produto;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.PedidoRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Transactional(readOnly = true)
    public Page<Pedido> listarTodos(Pageable pageable) {
        Page<Pedido> pagina = pedidoRepository.findAll(pageable);
        pagina.getContent().forEach(pedido -> {
            if (pedido.getItens() != null) {
                pedido.getItens().size();
            }
        });
        return pagina;
    }

    @Transactional(readOnly = true)
    public Pedido buscarPorId(Long id) {
        return pedidoRepository.findById(id).orElse(null);
    }

    @Transactional
    public Pedido salvar(PedidoDTO dto) {
        if (dto.getFkClienteId() != null && dto.getDataPedido() != null) {
            boolean duplicado = pedidoRepository.findAll().stream().anyMatch(p ->
                p.getCliente() != null && p.getCliente().getId().equals(dto.getFkClienteId()) &&
                p.getDataPedido() != null && p.getDataPedido().equals(dto.getDataPedido()) &&
                p.getValorTotal() != null && dto.getValorTotal() != null &&
                Math.abs(p.getValorTotal() - dto.getValorTotal()) < 0.01
            );
            if (duplicado) {
                throw new IllegalArgumentException("Já existe um pedido idêntico cadastrado para esta cliente nesta data.");
            }
        }
        Pedido pedido = new Pedido();
        preencherDadosPedido(pedido, dto);
        return pedidoRepository.save(pedido);
    }

    @Transactional
    public Pedido atualizar(Long id, PedidoDTO dto) {
        Pedido pedidoExistente = buscarPorId(id);
        if (pedidoExistente == null) {
            return null;
        }
        pedidoExistente.getItens().clear();
        preencherDadosPedido(pedidoExistente, dto);
        return pedidoRepository.save(pedidoExistente);
    }

    @Transactional
    public boolean excluir(Long id) {
        if (pedidoRepository.existsById(id)) {
            pedidoRepository.deleteById(id);
            return true;
        }
        return false;
    }

    @Transactional
    public Pedido atualizarStatus(Long id, String status) {
        Pedido pedido = buscarPorId(id);
        if (pedido != null && status != null) {
            try {
                pedido.setStatus(StatusPedido.valueOf(status.toUpperCase()));
                return pedidoRepository.save(pedido);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return pedido;
    }

    private void preencherDadosPedido(Pedido pedido, PedidoDTO dto) {
        pedido.setDataPedido(dto.getDataPedido() != null ? dto.getDataPedido() : LocalDate.now());
        pedido.setValorTotal(dto.getValorTotal());

        if (dto.getStatus() != null) {
            try {
                pedido.setStatus(StatusPedido.valueOf(dto.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                pedido.setStatus(StatusPedido.PENDENTE);
            }
        } else {
            pedido.setStatus(StatusPedido.PENDENTE);
        }

        if (dto.getFkClienteId() != null) {
            Usuario cliente = usuarioRepository.findById(dto.getFkClienteId()).orElse(null);
            pedido.setCliente(cliente);
        } else {
            pedido.setCliente(null);
        }

        if (dto.getItens() != null) {
            for (ItemPedidoDTO itemDto : dto.getItens()) {
                if (itemDto.getFkProdutoId() != null) {
                    Produto produto = produtoRepository.findById(itemDto.getFkProdutoId()).orElse(null);
                    ItemPedido item = new ItemPedido();
                    item.setPedido(pedido);
                    item.setProduto(produto);
                    int qtd = (itemDto.getQuantidade() != null && itemDto.getQuantidade() > 0) ? itemDto.getQuantidade() : 1;
                    item.setQuantidade(qtd);
                    pedido.getItens().add(item);
                }
            }
        }
    }
}