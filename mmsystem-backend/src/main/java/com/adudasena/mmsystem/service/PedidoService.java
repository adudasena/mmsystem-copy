package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.ItemPedidoDTO;
import com.adudasena.mmsystem.dto.PedidoDTO;
import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.ItemPedido;
import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.model.Produto;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.PagamentoRepository;
import com.adudasena.mmsystem.repository.PedidoRepository;
import com.adudasena.mmsystem.repository.ProdutoRepository;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

@Service
public class PedidoService {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Page<Pedido> listarTodos(Pageable pageable) {
        Page<Pedido> pagina = pedidoRepository.findByDeletedAtIsNull(pageable);
        pagina.getContent().forEach(pedido -> {
            if (pedido.getItens() != null) {
                pedido.getItens().size();
            }
        });
        return pagina;
    }

    @Transactional(readOnly = true)
    public Page<Pedido> listarExcluidos(Pageable pageable) {
        Page<Pedido> pagina = pedidoRepository.findByDeletedAtIsNotNull(pageable);
        pagina.getContent().forEach(pedido -> {
            if (pedido.getItens() != null) {
                pedido.getItens().size();
            }
        });
        return pagina;
    }

    @Transactional(readOnly = true)
    public Pedido buscarPorId(Long id) {
        return pedidoRepository.findByIdAndDeletedAtIsNull(id).orElse(null);
    }

    @Transactional
    public Pedido salvar(PedidoDTO dto) {
        if (dto.getFkClienteId() != null && dto.getFkClienteId() > 0 && dto.getDataPedido() != null) {
            boolean duplicado = pedidoRepository.findByDeletedAtIsNull(Pageable.unpaged()).stream().anyMatch(p ->
                p.getCliente() != null && p.getCliente().getId() != null && p.getCliente().getId().equals(dto.getFkClienteId()) &&
                p.getDataPedido() != null && p.getDataPedido().equals(dto.getDataPedido()) &&
                p.getValorTotal() != null && dto.getValorTotal() != null &&
                Math.abs(p.getValorTotal().doubleValue() - dto.getValorTotal().doubleValue()) < 0.01
            );
            if (duplicado) {
                throw new IllegalArgumentException("Já existe um pedido idêntico cadastrado para esta cliente nesta data.");
            }
        }
        Pedido pedido = new Pedido();
        preencherDadosPedido(pedido, dto);

        // Recalcula o valor total se necessário
        if (pedido.getValorTotal() == null || pedido.getValorTotal().compareTo(BigDecimal.ZERO) <= 0) {
            BigDecimal totalCalculado = BigDecimal.ZERO;
            if (pedido.getItens() != null) {
                for (ItemPedido item : pedido.getItens()) {
                    if (item.getProduto() != null && item.getProduto().getPreco() != null) {
                        BigDecimal preco = item.getProduto().getPreco();
                        BigDecimal qtd = BigDecimal.valueOf(item.getQuantidade() != null ? item.getQuantidade() : 1);
                        totalCalculado = totalCalculado.add(preco.multiply(qtd));
                    }
                }
            }
            if (totalCalculado.compareTo(BigDecimal.ZERO) > 0) {
                pedido.setValorTotal(totalCalculado);
            }
        }

        Pedido pedidoSalvo = pedidoRepository.save(pedido);

        // 1. Dá baixa no estoque para cada item do pedido criado
        if (pedidoSalvo.getItens() != null) {
            for (ItemPedido item : pedidoSalvo.getItens()) {
                if (item.getProduto() != null && item.getProduto().getId() != null && item.getQuantidade() != null && item.getQuantidade() > 0) {
                    darBaixaEstoqueProduto(item.getProduto().getId(), item.getQuantidade());
                }
            }
        }

        // 2. Gera automaticamente um registro em Pagamentos (Contas a Receber)
        gerarPagamentoAutomaticoParaPedido(pedidoSalvo);

        return pedidoSalvo;
    }

    @Transactional
    public Pedido atualizar(Long id, PedidoDTO dto) {
        Pedido pedidoExistente = buscarPorId(id);
        if (pedidoExistente == null) {
            return null;
        }
        pedidoExistente.getItens().clear();
        pedidoRepository.saveAndFlush(pedidoExistente);

        preencherDadosPedido(pedidoExistente, dto);

        if (dto.getValorTotal() == null || dto.getValorTotal().compareTo(BigDecimal.ZERO) <= 0) {
            BigDecimal totalCalculado = BigDecimal.ZERO;
            if (pedidoExistente.getItens() != null) {
                for (ItemPedido item : pedidoExistente.getItens()) {
                    if (item.getProduto() != null && item.getProduto().getPreco() != null) {
                        BigDecimal preco = item.getProduto().getPreco();
                        BigDecimal qtd = BigDecimal.valueOf(item.getQuantidade() != null ? item.getQuantidade() : 1);
                        totalCalculado = totalCalculado.add(preco.multiply(qtd));
                    }
                }
            }
            if (totalCalculado.compareTo(BigDecimal.ZERO) > 0) {
                pedidoExistente.setValorTotal(totalCalculado);
            }
        }

        Pedido pedidoSalvo = pedidoRepository.save(pedidoExistente);

        try {
            pagamentoRepository.findAll().stream()
                .filter(p -> p.getPedido() != null && id.equals(p.getPedido().getId()))
                .findFirst()
                .ifPresent(pag -> {
                    pag.setValor(pedidoSalvo.getValorTotal());
                    pagamentoRepository.save(pag);
                });
        } catch (Exception e) {
            System.err.println("Erro ao atualizar valor do pagamento vinculado: " + e.getMessage());
        }

        return pedidoSalvo;
    }

    @Transactional
    public boolean excluir(Long id) {
        Pedido p = pedidoRepository.findById(id).orElse(null);
        if (p != null) {
            p.setDeletedAt(java.time.LocalDateTime.now());
            pedidoRepository.save(p);
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
        pedido.setValorTotal(dto.getValorTotal() != null ? dto.getValorTotal() : BigDecimal.ZERO);

        if (dto.getStatus() != null) {
            try {
                pedido.setStatus(StatusPedido.valueOf(dto.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                pedido.setStatus(StatusPedido.PENDENTE);
            }
        } else {
            pedido.setStatus(StatusPedido.PENDENTE);
        }

        if (dto.getFkClienteId() != null && dto.getFkClienteId() > 0) {
            Usuario cliente = usuarioRepository.findById(dto.getFkClienteId()).orElse(null);
            pedido.setCliente(cliente);
        } else {
            pedido.setCliente(null);
        }

        if (dto.getItens() != null) {
            for (ItemPedidoDTO itemDto : dto.getItens()) {
                if (itemDto.getFkProdutoId() != null && itemDto.getFkProdutoId() > 0) {
                    Produto produto = produtoRepository.findById(itemDto.getFkProdutoId()).orElse(null);
                    if (produto != null) {
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

    private void darBaixaEstoqueProduto(Long produtoId, int qtdVendida) {
        try {
            Produto produto = produtoRepository.findById(produtoId).orElse(null);
            if (produto == null) return;

            String jsonEstoque = produto.getEstoqueDetalhado();
            if (jsonEstoque == null || jsonEstoque.trim().isEmpty()) return;

            Map<String, Integer> estoque = objectMapper.readValue(
                    jsonEstoque, new TypeReference<Map<String, Integer>>() {}
            );

            int restanteParaDeduzir = qtdVendida;
            for (Map.Entry<String, Integer> entry : estoque.entrySet()) {
                int saldoItem = entry.getValue() != null ? entry.getValue() : 0;
                if (saldoItem > 0 && restanteParaDeduzir > 0) {
                    int deduzir = Math.min(saldoItem, restanteParaDeduzir);
                    estoque.put(entry.getKey(), saldoItem - deduzir);
                    restanteParaDeduzir -= deduzir;
                }
            }

            produto.setEstoqueDetalhado(objectMapper.writeValueAsString(estoque));
            produtoRepository.saveAndFlush(produto);
        } catch (Exception e) {
            System.err.println("Erro ao decrementar estoque de produto avulso: " + e.getMessage());
        }
    }

    private void gerarPagamentoAutomaticoParaPedido(Pedido pedido) {
        try {
            Pagamento pagamento = new Pagamento();
            pagamento.setPedido(pedido);
            pagamento.setValor(pedido.getValorTotal() != null ? pedido.getValorTotal() : BigDecimal.ZERO);
            pagamento.setMetodoPagamento(MetodoPagamento.PAGAMENTO_FUTURO);
            pagamento.setDataVencimento(pedido.getDataPedido() != null ? pedido.getDataPedido().plusDays(30) : LocalDate.now().plusDays(30));
            pagamento.setStatus("PENDENTE");

            pagamentoRepository.save(pagamento);
        } catch (Exception e) {
            System.err.println("Erro ao gerar pagamento automático do pedido: " + e.getMessage());
        }
    }
}