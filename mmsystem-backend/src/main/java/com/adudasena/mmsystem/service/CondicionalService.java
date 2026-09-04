package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.CondicionalDTO;
import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.*;
import com.adudasena.mmsystem.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CondicionalService {

    @Autowired
    private CondicionalRepository repository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private PagamentoRepository pagamentoRepository;

    @Autowired
    private ObjectMapper objectMapper;

    public List<Condicional> listarTodos() {
        return repository.findAll();
    }

    public Page<Condicional> listarTodos(Pageable pageable) {
        return repository.findByDeletedAtIsNull(pageable);
    }

    public Condicional buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Condicional não encontrada: " + id));
    }

    @Transactional
    public Condicional criar(CondicionalDTO dto) {
        validarPrazoMaximo(dto.getDataSaida(), dto.getDataRetorno());

        Usuario usuario = usuarioRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado: " + dto.getClienteId()));

        Condicional condicional = new Condicional();
        condicional.setUsuario(usuario);
        condicional.setDataSaida(dto.getDataSaida());
        condicional.setDataRetorno(dto.getDataRetorno());
        condicional.setStatus(dto.getStatus() != null ? dto.getStatus().toUpperCase() : "ABERTA");

        preencherItens(condicional, dto.getItens());
        calcularTotal(condicional);

        return repository.save(condicional);
    }

    @Transactional
    public Condicional atualizar(Long id, CondicionalDTO dto) {
        validarPrazoMaximo(dto.getDataSaida(), dto.getDataRetorno());

        Condicional condicional = buscarPorId(id);

        Usuario usuario = usuarioRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado: " + dto.getClienteId()));

        condicional.setUsuario(usuario);
        condicional.setDataSaida(dto.getDataSaida());
        condicional.setDataRetorno(dto.getDataRetorno());
        if (dto.getStatus() != null) {
            condicional.setStatus(dto.getStatus().toUpperCase());
        }

        if (dto.getItens() != null) {
            condicional.getItens().clear();
            repository.saveAndFlush(condicional);

            preencherItens(condicional, dto.getItens());
        }

        calcularTotal(condicional);
        return repository.save(condicional);
    }

    @Transactional
    public Condicional finalizar(Long id, CondicionalDTO dto) {
        Condicional condicional = buscarPorId(id);

        List<CondicionalDTO.ItemSacolaDTO> itensEnviadosPeloFront = dto.getItens();
        if (itensEnviadosPeloFront == null || itensEnviadosPeloFront.isEmpty()) {
            throw new RuntimeException("Não é possível finalizar sem os itens da sacola.");
        }

        boolean possuiVenda = false;
        boolean possuiDevolucao = false;
        List<ItemCondicional> itensVendidos = new ArrayList<>();

        for (ItemCondicional itemBanco : condicional.getItens()) {
            CondicionalDTO.ItemSacolaDTO itemDto = itensEnviadosPeloFront.stream()
                    .filter(i -> i.getProdutoId().equals(itemBanco.getProduto().getId())
                            && (i.getCorEscolhida() == null || i.getCorEscolhida().equals(itemBanco.getCorEscolhida()))
                            && (i.getTamanhoEscolhido() == null || i.getTamanhoEscolhido().equals(itemBanco.getTamanhoEscolhido())))
                    .findFirst()
                    .orElse(null);

            if (itemDto != null && itemDto.getStatusItem() != null) {
                String acaoVendedora = itemDto.getStatusItem().toUpperCase();

                if (acaoVendedora.equals("VENDIDO")) {
                    itemBanco.setStatusItem("VENDIDO");
                    possuiVenda = true;
                    itensVendidos.add(itemBanco);

                    atualizarEstoqueProduto(itemBanco.getProduto(), itemBanco.getCorEscolhida(), itemBanco.getTamanhoEscolhido(), itemBanco.getQuantidade());
                } else if (acaoVendedora.equals("DISPONIVEL") || acaoVendedora.equals("DEVOLVIDO") || acaoVendedora.equals("DEVOLVIDA")) {
                    itemBanco.setStatusItem("DISPONIVEL");
                    possuiDevolucao = true;
                }
            }
        }

        if (possuiVenda) {
            condicional.setStatus("FINALIZADA");

            // 1. Gera Pedido de Venda associado aos itens vendidos
            gerarPedidoEVendaParaCondicional(condicional, itensVendidos);

        } else if (possuiDevolucao) {
            condicional.setStatus("DEVOLVIDA");
        }

        return repository.save(condicional);
    }

    private void gerarPedidoEVendaParaCondicional(Condicional condicional, List<ItemCondicional> itensVendidos) {
        try {
            Pedido pedido = new Pedido();
            pedido.setCliente(condicional.getUsuario());
            pedido.setCondicional(condicional);
            pedido.setDataPedido(LocalDate.now());
            pedido.setStatus(StatusPedido.PENDENTE);

            BigDecimal valorTotalVendido = BigDecimal.ZERO;
            List<ItemPedido> itensPedido = new ArrayList<>();

            for (ItemCondicional itemCond : itensVendidos) {
                ItemPedido itemPed = new ItemPedido();
                itemPed.setPedido(pedido);
                itemPed.setProduto(itemCond.getProduto());
                itemPed.setQuantidade(itemCond.getQuantidade() != null ? itemCond.getQuantidade() : 1);
                itensPedido.add(itemPed);

                BigDecimal precoUnit = itemCond.getProduto() != null && itemCond.getProduto().getPreco() != null 
                        ? itemCond.getProduto().getPreco() : BigDecimal.ZERO;
                valorTotalVendido = valorTotalVendido.add(precoUnit.multiply(BigDecimal.valueOf(itemPed.getQuantidade())));
            }

            pedido.setItens(itensPedido);
            pedido.setValorTotal(valorTotalVendido);
            Pedido pedidoSalvo = pedidoRepository.save(pedido);

            // 2. Gera Pagamento PENDENTE para o Pedido
            Pagamento pagamento = new Pagamento();
            pagamento.setPedido(pedidoSalvo);
            pagamento.setValor(valorTotalVendido);
            pagamento.setMetodoPagamento(MetodoPagamento.PAGAMENTO_FUTURO);
            pagamento.setDataVencimento(LocalDate.now().plusDays(30));
            pagamento.setStatus("PENDENTE");
            pagamentoRepository.save(pagamento);

        } catch (Exception e) {
            System.err.println("Erro ao gerar Pedido e Pagamento a partir do condicional: " + e.getMessage());
        }
    }

    @Transactional
    public void excluir(Long id) {
        Condicional condicional = buscarPorId(id);
        condicional.setDeletedAt(LocalDateTime.now());
        repository.save(condicional);
    }

    @Transactional
    public Condicional processarPedidoVitrine(VitrinePedidoDTO dto) {
        Usuario usuario = null;

        if (dto.getUsuarioId() != null) {
            usuario = usuarioRepository.findById(dto.getUsuarioId()).orElse(null);
        }

        if (usuario == null && dto.getTelefoneCliente() != null && !dto.getTelefoneCliente().trim().isEmpty()) {
            Optional<Usuario> porTelefone = usuarioRepository.findByTelefone(dto.getTelefoneCliente().trim());
            if (porTelefone.isPresent()) {
                usuario = porTelefone.get();
            } else {
                Usuario novoCliente = new Usuario();
                novoCliente.setNome(dto.getNomeCliente() != null && !dto.getNomeCliente().trim().isEmpty() ? dto.getNomeCliente().trim() : "Cliente Vitrine");
                novoCliente.setTelefone(dto.getTelefoneCliente().trim());
                novoCliente.setPerfil(Perfil.ROLE_CLIENTE);
                usuario = usuarioRepository.save(novoCliente);
            }
        }

        if (usuario == null) {
            List<Usuario> lista = usuarioRepository.findByDeletedAtIsNull();
            usuario = lista.stream().filter(u -> u.getPerfil() == Perfil.ROLE_CLIENTE).findFirst().orElse(null);
            if (usuario == null && !lista.isEmpty()) {
                usuario = lista.get(0);
            }
        }

        if (usuario == null) {
            throw new RuntimeException("Nenhum cliente disponível para vincular a sacola da vitrine.");
        }

        Condicional condicional = new Condicional();
        condicional.setUsuario(usuario);
        condicional.setDataSaida(LocalDate.now());
        condicional.setDataRetorno(LocalDate.now().plusDays(3));
        condicional.setStatus("ABERTA");

        final Condicional condicionalRef = condicional;
        List<ItemCondicional> itens = dto.getItens().stream().map(itemDto -> {
            Produto produto = produtoRepository.findById(itemDto.getProdutoId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado ID: " + itemDto.getProdutoId()));

            ItemCondicional item = new ItemCondicional();
            item.setCondicional(condicionalRef);
            item.setProduto(produto);
            item.setQuantidade(itemDto.getQuantidade() != null ? itemDto.getQuantidade() : 1);
            item.setCorEscolhida(itemDto.getCorEscolhida());
            item.setTamanhoEscolhido(itemDto.getTamanhoEscolhido());
            item.setStatusItem("EM_CONDICIONAL");

            return item;
        }).collect(Collectors.toList());

        condicional.setItens(itens);
        calcularTotal(condicional);

        return repository.save(condicional);
    }

    private void preencherItens(Condicional condicional, List<CondicionalDTO.ItemSacolaDTO> itensDTO) {
        if (itensDTO == null) return;
        for (CondicionalDTO.ItemSacolaDTO itemDTO : itensDTO) {
            Produto produto = produtoRepository.findById(itemDTO.getProdutoId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado: " + itemDTO.getProdutoId()));

            ItemCondicional item = new ItemCondicional();
            item.setCondicional(condicional);
            item.setProduto(produto);
            item.setQuantidade(itemDTO.getQuantidade() != null ? itemDTO.getQuantidade() : 1);
            item.setCorEscolhida(itemDTO.getCorEscolhida());
            item.setTamanhoEscolhido(itemDTO.getTamanhoEscolhido());
            item.setStatusItem(itemDTO.getStatusItem() != null ? itemDTO.getStatusItem().toUpperCase() : "EM_CONDICIONAL");

            condicional.getItens().add(item);
        }
    }

    private void calcularTotal(Condicional condicional) {
        BigDecimal total = condicional.getItens().stream()
                .map(i -> i.getProduto().getPreco()
                        .multiply(BigDecimal.valueOf(i.getQuantidade())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        condicional.setValorTotal(total);
    }

    private void validarPrazoMaximo(LocalDate inicio, LocalDate fim) {
        if (inicio != null && fim != null) {
            long dias = ChronoUnit.DAYS.between(inicio, fim);
            if (dias > 30) {
                throw new RuntimeException("Prazo inválido! O período da sacola condicional não pode exceder 30 dias.");
            }
        }
    }

    private void atualizarEstoqueProduto(Produto produtoOriginal, String cor, String tamanho, int qtdVendida) {
        try {
            Produto produto = produtoRepository.findById(produtoOriginal.getId())
                    .orElseThrow(() -> new RuntimeException("Produto não localizado para atualização de estoque."));

            String jsonEstoque = produto.getEstoqueDetalhado();
            if (jsonEstoque == null || jsonEstoque.trim().isEmpty()) return;

            Map<String, Integer> estoque = objectMapper.readValue(
                    jsonEstoque, new TypeReference<Map<String, Integer>>() {}
            );

            String chaveComposta = (cor != null ? cor.trim() : "") + "-" + (tamanho != null ? tamanho.trim() : "");

            if (estoque.containsKey(chaveComposta)) {
                int qtdAtual = estoque.get(chaveComposta) != null ? estoque.get(chaveComposta) : 0;
                int novaQtd = Math.max(0, qtdAtual - qtdVendida);
                estoque.put(chaveComposta, novaQtd);
            } else {
                // Caso a chave exata não exista, desconta da primeira variação disponível
                int restante = qtdVendida;
                for (Map.Entry<String, Integer> entry : estoque.entrySet()) {
                    int val = entry.getValue() != null ? entry.getValue() : 0;
                    if (val > 0 && restante > 0) {
                        int deduzir = Math.min(val, restante);
                        estoque.put(entry.getKey(), val - deduzir);
                        restante -= deduzir;
                    }
                }
            }

            produto.setEstoqueDetalhado(objectMapper.writeValueAsString(estoque));
            produtoRepository.saveAndFlush(produto);
        } catch (Exception e) {
            System.err.println("Falha ao atualizar estoque no condicional: " + e.getMessage());
        }
    }
}