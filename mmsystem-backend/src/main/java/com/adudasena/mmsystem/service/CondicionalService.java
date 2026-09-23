package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.CondicionalDTO;
import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.enums.StatusPagamento;
import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.*;
import com.adudasena.mmsystem.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
@lombok.RequiredArgsConstructor
public class CondicionalService {

    private final CondicionalRepository repository;

    private final UsuarioRepository usuarioRepository;

    private final ProdutoRepository produtoRepository;

    private final PedidoRepository pedidoRepository;

    private final PagamentoRepository pagamentoRepository;

    private final ObjectMapper objectMapper;

    public List<Condicional> listarTodos() {
        return repository.findByDeletedAtIsNull();
    }

    public Page<Condicional> listarTodos(Pageable pageable) {
        return repository.findByDeletedAtIsNull(pageable);
    }

    public Condicional buscarPorId(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id)
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
                            && (i.getTamanhoEscolhido() == null
                                    || i.getTamanhoEscolhido().equals(itemBanco.getTamanhoEscolhido())))
                    .findFirst()
                    .orElse(null);

            if (itemDto != null && itemDto.getStatusItem() != null) {
                String acaoVendedora = itemDto.getStatusItem().toUpperCase();

                if (acaoVendedora.equals("VENDIDO")) {
                    itemBanco.setStatusItem("VENDIDO");
                    possuiVenda = true;
                    itensVendidos.add(itemBanco);
                } else if (acaoVendedora.equals("DISPONIVEL") || acaoVendedora.equals("DEVOLVIDO")
                        || acaoVendedora.equals("DEVOLVIDA")) {
                    // Restaura estoque pois item saiu de EM_CONDICIONAL para DISPONIVEL
                    if (!"DISPONIVEL".equalsIgnoreCase(itemBanco.getStatusItem())) {
                        alterarEstoqueProduto(itemBanco.getProduto(), itemBanco.getCorEscolhida(),
                                itemBanco.getTamanhoEscolhido(), +itemBanco.getQuantidade());
                    }
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
            pedido.setStatus(StatusPedido.AGUARDANDO_PAGAMENTO);

            BigDecimal valorTotalVendido = BigDecimal.ZERO;
            List<ItemPedido> itensPedido = new ArrayList<>();

            for (ItemCondicional itemCond : itensVendidos) {
                ItemPedido itemPed = new ItemPedido();
                itemPed.setPedido(pedido);
                itemPed.setProduto(itemCond.getProduto());
                itemPed.setQuantidade(itemCond.getQuantidade() != null ? itemCond.getQuantidade() : 1);
                itensPedido.add(itemPed);

                BigDecimal precoUnit = itemCond.getProduto() != null && itemCond.getProduto().getPreco() != null
                        ? itemCond.getProduto().getPreco()
                        : BigDecimal.ZERO;
                valorTotalVendido = valorTotalVendido
                        .add(precoUnit.multiply(BigDecimal.valueOf(itemPed.getQuantidade())));
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
            pagamento.setStatus(StatusPagamento.PENDENTE);
            pagamentoRepository.save(pagamento);

        } catch (Exception e) {
            System.err.println("Erro ao gerar Pedido e Pagamento a partir do condicional: " + e.getMessage());
        }
    }

    public Page<Condicional> listarExcluidos(Pageable pageable) {
        return repository.findByDeletedAtIsNotNull(pageable);
    }

    @Transactional
    public void excluir(Long id) {
        Condicional condicional = buscarPorId(id);
        condicional.setDeletedAt(LocalDateTime.now());
        repository.save(condicional);
    }

    @Transactional
    public void restaurar(Long id) {
        Condicional condicional = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Condicional não encontrada: " + id));
        condicional.setDeletedAt(null);
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
                novoCliente.setNome(dto.getNomeCliente() != null && !dto.getNomeCliente().trim().isEmpty()
                        ? dto.getNomeCliente().trim()
                        : "Cliente Vitrine");
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
            Usuario fallback = new Usuario();
            fallback.setNome(
                    dto.getNomeCliente() != null && !dto.getNomeCliente().trim().isEmpty() ? dto.getNomeCliente().trim()
                            : "Cliente Vitrine");
            fallback.setTelefone(dto.getTelefoneCliente() != null && !dto.getTelefoneCliente().trim().isEmpty()
                    ? dto.getTelefoneCliente().trim()
                    : "00000000000");
            fallback.setPerfil(Perfil.ROLE_CLIENTE);
            usuario = usuarioRepository.save(fallback);
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

            int qtd = itemDto.getQuantidade() != null ? itemDto.getQuantidade() : 1;
            String cor = itemDto.getCorEscolhida();
            String tamanho = itemDto.getTamanhoEscolhido();

            // 1. Valida se há saldo em estoque para a variação
            validarEstoqueDisponivel(produto, cor, tamanho, qtd);

            // 2. Abate do estoque do produto no banco
            alterarEstoqueProduto(produto, cor, tamanho, -qtd);

            ItemCondicional item = new ItemCondicional();
            item.setCondicional(condicionalRef);
            item.setProduto(produto);
            item.setQuantidade(qtd);
            item.setCorEscolhida(cor);
            item.setTamanhoEscolhido(tamanho);
            item.setStatusItem("EM_CONDICIONAL");

            return item;
        }).collect(Collectors.toList());

        condicional.setItens(itens);
        calcularTotal(condicional);

        return repository.save(condicional);
    }

    private void preencherItens(Condicional condicional, List<CondicionalDTO.ItemSacolaDTO> itensDTO) {
        if (itensDTO == null)
            return;
        for (CondicionalDTO.ItemSacolaDTO itemDTO : itensDTO) {
            Produto produto = produtoRepository.findById(itemDTO.getProdutoId())
                    .orElseThrow(() -> new RuntimeException("Produto não encontrado: " + itemDTO.getProdutoId()));

            int qtd = itemDTO.getQuantidade() != null ? itemDTO.getQuantidade() : 1;
            String cor = itemDTO.getCorEscolhida();
            String tamanho = itemDTO.getTamanhoEscolhido();
            String statusItem = itemDTO.getStatusItem() != null ? itemDTO.getStatusItem().toUpperCase()
                    : "EM_CONDICIONAL";

            if (!"DISPONIVEL".equalsIgnoreCase(statusItem) && !"DEVOLVIDO".equalsIgnoreCase(statusItem)
                    && !"DEVOLVIDA".equalsIgnoreCase(statusItem)) {
                validarEstoqueDisponivel(produto, cor, tamanho, qtd);
                alterarEstoqueProduto(produto, cor, tamanho, -qtd);
            }

            ItemCondicional item = new ItemCondicional();
            item.setCondicional(condicional);
            item.setProduto(produto);
            item.setQuantidade(qtd);
            item.setCorEscolhida(cor);
            item.setTamanhoEscolhido(tamanho);
            item.setStatusItem(statusItem);

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

    public int obterEstoqueDisponivel(Produto produto, String cor, String tamanho) {
        String jsonEstoque = produto.getEstoqueDetalhado();
        if (jsonEstoque == null || jsonEstoque.trim().isEmpty()) {
            return 99;
        }
        try {
            Map<String, Integer> estoque = objectMapper.readValue(
                    jsonEstoque, new TypeReference<Map<String, Integer>>() {
                    });
            if (estoque == null || estoque.isEmpty())
                return 99;

            String c = cor != null ? cor.trim() : "";
            String t = tamanho != null ? tamanho.trim() : "";

            String chave1 = c + "-" + t;
            if (estoque.containsKey(chave1))
                return estoque.get(chave1) != null ? estoque.get(chave1) : 0;

            String chave2 = t + "-" + c;
            if (estoque.containsKey(chave2))
                return estoque.get(chave2) != null ? estoque.get(chave2) : 0;

            if (!t.isEmpty() && estoque.containsKey(t))
                return estoque.get(t) != null ? estoque.get(t) : 0;
            if (!c.isEmpty() && estoque.containsKey(c))
                return estoque.get(c) != null ? estoque.get(c) : 0;

            for (Map.Entry<String, Integer> entry : estoque.entrySet()) {
                String k = entry.getKey();
                if (k.equalsIgnoreCase(chave1) || k.equalsIgnoreCase(chave2) || k.equalsIgnoreCase(t)
                        || k.equalsIgnoreCase(c)) {
                    return entry.getValue() != null ? entry.getValue() : 0;
                }
            }

            return 0;
        } catch (Exception e) {
            return 99;
        }
    }

    public void validarEstoqueDisponivel(Produto produto, String cor, String tamanho, int qtdSolicitada) {
        int disponivel = obterEstoqueDisponivel(produto, cor, tamanho);
        if (disponivel < qtdSolicitada) {
            String detalheVariacao = (tamanho != null && !tamanho.isEmpty() ? "Tamanho: " + tamanho : "")
                    + (cor != null && !cor.isEmpty()
                            ? (tamanho != null && !tamanho.isEmpty() ? ", Cor: " : "Cor: ") + cor
                            : "");
            if (detalheVariacao.isEmpty())
                detalheVariacao = "Padrão";

            throw new IllegalArgumentException("Saldo insuficiente em estoque para o produto '"
                    + produto.getNome() + "' (" + detalheVariacao + "). Estoque disponível: "
                    + disponivel + ", Solicitado: " + qtdSolicitada + ".");
        }
    }

    private void alterarEstoqueProduto(Produto produtoOriginal, String cor, String tamanho, int deltaQtd) {
        try {
            Produto produto = produtoRepository.findById(produtoOriginal.getId())
                    .orElseThrow(() -> new RuntimeException("Produto não localizado para atualização de estoque."));

            String jsonEstoque = produto.getEstoqueDetalhado();
            if (jsonEstoque == null || jsonEstoque.trim().isEmpty())
                return;

            Map<String, Integer> estoque = objectMapper.readValue(
                    jsonEstoque, new TypeReference<Map<String, Integer>>() {
                    });
            if (estoque == null || estoque.isEmpty())
                return;

            String c = cor != null ? cor.trim() : "";
            String t = tamanho != null ? tamanho.trim() : "";

            String chaveEncontrada = null;
            String chave1 = c + "-" + t;
            String chave2 = t + "-" + c;

            if (estoque.containsKey(chave1))
                chaveEncontrada = chave1;
            else if (estoque.containsKey(chave2))
                chaveEncontrada = chave2;
            else if (!t.isEmpty() && estoque.containsKey(t))
                chaveEncontrada = t;
            else if (!c.isEmpty() && estoque.containsKey(c))
                chaveEncontrada = c;
            else {
                for (String k : estoque.keySet()) {
                    if (k.equalsIgnoreCase(chave1) || k.equalsIgnoreCase(chave2) || k.equalsIgnoreCase(t)
                            || k.equalsIgnoreCase(c)) {
                        chaveEncontrada = k;
                        break;
                    }
                }
            }

            if (chaveEncontrada != null) {
                int qtdAtual = estoque.get(chaveEncontrada) != null ? estoque.get(chaveEncontrada) : 0;
                int novaQtd = Math.max(0, qtdAtual + deltaQtd);
                estoque.put(chaveEncontrada, novaQtd);
            } else if (deltaQtd < 0) {
                int restante = Math.abs(deltaQtd);
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