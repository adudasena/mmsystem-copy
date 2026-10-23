package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.ItemPedidoDTO;
import com.adudasena.mmsystem.dto.PedidoDTO;
import com.adudasena.mmsystem.dto.PedidoResumoDTO;
import com.adudasena.mmsystem.dto.VitrineItemDTO;
import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.enums.StatusPagamento;
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
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@lombok.RequiredArgsConstructor
public class PedidoService {

    private final PedidoRepository pedidoRepository;

    private final UsuarioRepository usuarioRepository;

    private final ProdutoRepository produtoRepository;

    private final PagamentoRepository pagamentoRepository;

    private final ObjectMapper objectMapper;

    private final UsuarioService usuarioService;

    @Lazy
    private final CondicionalService condicionalService;

    @Transactional(readOnly = true)
    public List<String> opcoesFiltroStatus() {
        Set<String> opcoes = new LinkedHashSet<>();
        for (StatusPedido status : pedidoRepository.listarStatusAtivos()) {
            if (status == StatusPedido.PAGO || status == StatusPedido.CONCLUIDO) {
                opcoes.add("CONCLUIDO");
            } else if (status == StatusPedido.PENDENTE || status == StatusPedido.AGUARDANDO_PAGAMENTO) {
                opcoes.add("AGUARDANDO_PAGAMENTO");
            } else if (status == StatusPedido.CANCELADO) {
                opcoes.add("CANCELADO");
            }
        }
        return new ArrayList<>(opcoes);
    }

    @Transactional(readOnly = true)
    public List<PedidoResumoDTO> listarResumo() {
        return pedidoRepository.listarResumo();
    }

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

        // 1. Valida e dá baixa no estoque (falha => nada é gravado). Pedido cancelado não segura estoque.
        aplicarDeltaEstoque(Map.of(), quantidadesRetidas(pedido, pedido.getStatus()));

        Pedido pedidoSalvo = pedidoRepository.save(pedido);

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
        Map<Long, Integer> retidoAntes = quantidadesRetidas(pedidoExistente, pedidoExistente.getStatus());
        pedidoExistente.getItens().clear();
        pedidoRepository.saveAndFlush(pedidoExistente);

        preencherDadosPedido(pedidoExistente, dto);
        // Só a diferença mexe no estoque: aumentar a quantidade valida o saldo, reduzir/cancelar devolve.
        aplicarDeltaEstoque(retidoAntes, quantidadesRetidas(pedidoExistente, pedidoExistente.getStatus()));

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
                .forEach(pag -> {
                    pag.setValor(pedidoSalvo.getValorTotal());
                    if (pedidoSalvo.getStatus() == StatusPedido.CONCLUIDO) {
                        pag.setStatus(StatusPagamento.APROVADO);
                    } else if (pedidoSalvo.getStatus() == StatusPedido.CANCELADO) {
                        pag.setStatus(StatusPagamento.CANCELADO);
                    }
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
    public boolean restaurar(Long id) {
        Pedido p = pedidoRepository.findById(id).orElse(null);
        if (p != null) {
            p.setDeletedAt(null);
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
                StatusPedido statusEnum = StatusPedido.valueOf(status.toUpperCase());
                sincronizarEstoquePorStatus(pedido, pedido.getStatus(), statusEnum);
                pedido.setStatus(statusEnum);
                Pedido salvo = pedidoRepository.save(pedido);

                // Sincroniza o lançamento de Pagamento vinculado
                pagamentoRepository.findAll().stream()
                    .filter(p -> p.getPedido() != null && id.equals(p.getPedido().getId()))
                    .forEach(pag -> {
                        if (statusEnum == StatusPedido.CONCLUIDO) {
                            pag.setStatus(StatusPagamento.APROVADO);
                        } else if (statusEnum == StatusPedido.CANCELADO) {
                            pag.setStatus(StatusPagamento.CANCELADO);
                        } else if (statusEnum == StatusPedido.AGUARDANDO_PAGAMENTO) {
                            pag.setStatus(StatusPagamento.PENDENTE);
                        }
                        pagamentoRepository.save(pag);
                    });

                return salvo;
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return pedido;
    }

    /**
     * Cancelar um pedido devolve as peças ao estoque (e à vitrine); reabri-lo abate de novo.
     * Só age na transição de/para CANCELADO, então repetir o mesmo status nunca duplica a baixa.
     */
    private void sincronizarEstoquePorStatus(Pedido pedido, StatusPedido anterior, StatusPedido novo) {
        boolean eraCancelado = anterior == StatusPedido.CANCELADO;
        boolean ficaCancelado = novo == StatusPedido.CANCELADO;
        if (eraCancelado == ficaCancelado || pedido.getItens() == null) {
            return;
        }
        for (ItemPedido item : pedido.getItens()) {
            if (item.getProduto() == null || item.getQuantidade() == null || item.getQuantidade() <= 0) {
                continue;
            }
            if (ficaCancelado) {
                condicionalService.alterarEstoqueProduto(item.getProduto(), item.getCorEscolhida(),
                        item.getTamanhoEscolhido(), +item.getQuantidade());
            } else {
                boolean temVariacao = (item.getCorEscolhida() != null && !item.getCorEscolhida().isBlank())
                        || (item.getTamanhoEscolhido() != null && !item.getTamanhoEscolhido().isBlank());
                if (temVariacao) {
                    condicionalService.validarEstoqueDisponivel(item.getProduto(), item.getCorEscolhida(),
                            item.getTamanhoEscolhido(), item.getQuantidade());
                }
                condicionalService.alterarEstoqueProduto(item.getProduto(), item.getCorEscolhida(),
                        item.getTamanhoEscolhido(), -item.getQuantidade());
            }
        }
    }

    private void preencherDadosPedido(Pedido pedido, PedidoDTO dto) {
        pedido.setDataPedido(dto.getDataPedido() != null ? dto.getDataPedido() : LocalDate.now());
        pedido.setValorTotal(dto.getValorTotal() != null ? dto.getValorTotal() : BigDecimal.ZERO);

        if (dto.getStatus() != null) {
            try {
                pedido.setStatus(StatusPedido.valueOf(dto.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                pedido.setStatus(StatusPedido.AGUARDANDO_PAGAMENTO);
            }
        } else {
            pedido.setStatus(StatusPedido.AGUARDANDO_PAGAMENTO);
        }

        if (dto.getFkClienteId() != null && dto.getFkClienteId() > 0) {
            Usuario cliente = usuarioRepository.findById(dto.getFkClienteId()).orElse(null);
            pedido.setCliente(cliente);
        } else {
            pedido.setCliente(null);
        }

        if (dto.getItens() != null) {
            Map<Long, Integer> quantidadesPorProduto = new LinkedHashMap<>();
            for (ItemPedidoDTO itemDto : dto.getItens()) {
                if (itemDto.getFkProdutoId() == null || itemDto.getFkProdutoId() <= 0) {
                    continue;
                }
                int qtd = (itemDto.getQuantidade() != null && itemDto.getQuantidade() > 0) ? itemDto.getQuantidade() : 1;
                quantidadesPorProduto.merge(itemDto.getFkProdutoId(), qtd, Integer::sum);
            }
            for (Map.Entry<Long, Integer> entrada : quantidadesPorProduto.entrySet()) {
                Produto produto = produtoRepository.findById(entrada.getKey()).orElse(null);
                if (produto != null) {
                    ItemPedido item = new ItemPedido();
                    item.setPedido(pedido);
                    item.setProduto(produto);
                    item.setQuantidade(entrada.getValue());
                    pedido.getItens().add(item);
                }
            }
        }
    }

    /** Quantidade por produto que o pedido mantém fora do estoque (vazio se cancelado). */
    private Map<Long, Integer> quantidadesRetidas(Pedido pedido, StatusPedido status) {
        Map<Long, Integer> mapa = new LinkedHashMap<>();
        if (status == StatusPedido.CANCELADO || pedido.getItens() == null) {
            return mapa;
        }
        for (ItemPedido item : pedido.getItens()) {
            if (item.getProduto() != null && item.getProduto().getId() != null
                    && item.getQuantidade() != null && item.getQuantidade() > 0) {
                mapa.merge(item.getProduto().getId(), item.getQuantidade(), Integer::sum);
            }
        }
        return mapa;
    }

    private void aplicarDeltaEstoque(Map<Long, Integer> antes, Map<Long, Integer> depois) {
        Set<Long> ids = new LinkedHashSet<>(antes.keySet());
        ids.addAll(depois.keySet());
        // Primeiro devolve (delta > 0), depois retira (delta < 0), para não falhar à toa.
        for (int passo = 0; passo < 2; passo++) {
            for (Long id : ids) {
                int delta = antes.getOrDefault(id, 0) - depois.getOrDefault(id, 0);
                if ((passo == 0 && delta > 0) || (passo == 1 && delta < 0)) {
                    Produto produto = produtoRepository.findById(id).orElse(null);
                    if (produto != null) {
                        ajustarEstoqueTotal(produto, delta);
                    }
                }
            }
        }
    }

    /** Ajuste sem variação (pedido manual): soma/subtrai no total, validando saldo. Estoque não controlado = ignora. */
    private void ajustarEstoqueTotal(Produto produto, int delta) {
        String json = produto.getEstoqueDetalhado();
        if (delta == 0 || json == null || json.trim().isEmpty()) {
            return;
        }
        try {
            Map<String, Integer> estoque = objectMapper.readValue(json, new TypeReference<Map<String, Integer>>() {});
            if (estoque == null || estoque.isEmpty()) {
                return;
            }
            if (delta > 0) {
                String primeira = estoque.keySet().iterator().next();
                estoque.put(primeira, (estoque.get(primeira) != null ? estoque.get(primeira) : 0) + delta);
            } else {
                int total = estoque.values().stream().mapToInt(v -> v != null ? v : 0).sum();
                int precisa = -delta;
                if (total < precisa) {
                    throw new IllegalArgumentException("Estoque insuficiente para '" + produto.getNome()
                            + "'. Disponível: " + total + ", solicitado: " + precisa + ".");
                }
                for (Map.Entry<String, Integer> entry : estoque.entrySet()) {
                    int saldo = entry.getValue() != null ? entry.getValue() : 0;
                    int tirar = Math.min(saldo, precisa);
                    entry.setValue(saldo - tirar);
                    precisa -= tirar;
                    if (precisa == 0) break;
                }
            }
            produto.setEstoqueDetalhado(objectMapper.writeValueAsString(estoque));
            produtoRepository.saveAndFlush(produto);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao atualizar o estoque do produto: " + e.getMessage(), e);
        }
    }

    private void gerarPagamentoAutomaticoParaPedido(Pedido pedido) {
        try {
            Pagamento pagamento = new Pagamento();
            pagamento.setPedido(pedido);
            pagamento.setValor(pedido.getValorTotal() != null ? pedido.getValorTotal() : BigDecimal.ZERO);
            pagamento.setMetodoPagamento(MetodoPagamento.PAGAMENTO_FUTURO);
            pagamento.setDataVencimento(pedido.getDataPedido() != null ? pedido.getDataPedido().plusDays(30) : LocalDate.now().plusDays(30));
            pagamento.setStatus(StatusPagamento.PENDENTE);

            pagamentoRepository.save(pagamento);
        } catch (Exception e) {
            System.err.println("Erro ao gerar pagamento automático do pedido: " + e.getMessage());
        }
    }

    @Transactional
    public Pedido processarVendaVitrine(VitrinePedidoDTO dto) {
        Usuario cliente = usuarioService.buscarOuCriarClienteVitrine(
                dto.getUsuarioId(), dto.getNomeCliente(), dto.getTelefoneCliente(), dto.isAtualizarNome());

        Pedido pedido = new Pedido();
        pedido.setCliente(cliente);
        pedido.setDataPedido(LocalDate.now());
        pedido.setStatus(StatusPedido.AGUARDANDO_PAGAMENTO);

        BigDecimal total = BigDecimal.ZERO;
        for (VitrineItemDTO itemDto : dto.getItens()) {
            Produto produto = produtoRepository.findById(itemDto.getProdutoId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado ID: " + itemDto.getProdutoId()));
            int qtd = itemDto.getQuantidade() != null ? itemDto.getQuantidade() : 1;
            condicionalService.validarEstoqueDisponivel(produto, itemDto.getCorEscolhida(), itemDto.getTamanhoEscolhido(), qtd);
            condicionalService.alterarEstoqueProduto(produto, itemDto.getCorEscolhida(), itemDto.getTamanhoEscolhido(), -qtd);

            ItemPedido item = new ItemPedido();
            item.setPedido(pedido);
            item.setProduto(produto);
            item.setQuantidade(qtd);
            item.setCorEscolhida(itemDto.getCorEscolhida());
            item.setTamanhoEscolhido(itemDto.getTamanhoEscolhido());
            pedido.getItens().add(item);

            BigDecimal preco = produto.getPreco() != null ? produto.getPreco() : BigDecimal.ZERO;
            total = total.add(preco.multiply(BigDecimal.valueOf(qtd)));
        }

        pedido.setValorTotal(total);
        Pedido salvo = pedidoRepository.save(pedido);

        Pagamento pagamento = new Pagamento();
        pagamento.setPedido(salvo);
        pagamento.setValor(total);
        pagamento.setMetodoPagamento(MetodoPagamento.PIX);
        pagamento.setDataVencimento(LocalDate.now());
        pagamento.setStatus(StatusPagamento.PENDENTE);
        pagamentoRepository.save(pagamento);

        return salvo;
    }
}
