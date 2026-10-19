package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.VitrineItemDTO;
import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@Service
public class VitrineProtecaoService {

    private static final int LIMITE_POR_HORA = 5;
    private static final long JANELA_RATE_MS = 60 * 60 * 1000L;
    private static final long JANELA_IDEMPOTENCIA_MS = 2 * 60 * 1000L;

    private final ConcurrentHashMap<String, CopyOnWriteArrayList<Long>> tentativas = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> pedidosRecentes = new ConcurrentHashMap<>();

    public void protegerCheckout(String ip, VitrinePedidoDTO dto) {
        String telefone = ContatoCliente.somenteDigitos(dto.getTelefoneCliente());
        registrarELimitar("ip:" + (ip == null || ip.isBlank() ? "desconhecido" : ip));
        registrarELimitar("tel:" + telefone);
        recusarSeDuplicado(telefone, dto);
    }

    public void marcarPedidoRegistrado(VitrinePedidoDTO dto) {
        String telefone = ContatoCliente.somenteDigitos(dto.getTelefoneCliente());
        pedidosRecentes.put(fingerprint(telefone, dto), System.currentTimeMillis());
    }

    private void recusarSeDuplicado(String telefone, VitrinePedidoDTO dto) {
        long agora = System.currentTimeMillis();
        pedidosRecentes.entrySet().removeIf(e -> agora - e.getValue() > JANELA_IDEMPOTENCIA_MS);
        Long anterior = pedidosRecentes.get(fingerprint(telefone, dto));
        if (anterior != null && agora - anterior <= JANELA_IDEMPOTENCIA_MS) {
            throw new IllegalArgumentException("Pedido já registrado. Não envie de novo.");
        }
    }

    private void registrarELimitar(String chave) {
        long agora = System.currentTimeMillis();
        var lista = tentativas.computeIfAbsent(chave, k -> new CopyOnWriteArrayList<>());
        lista.removeIf(ts -> agora - ts > JANELA_RATE_MS);
        if (lista.size() >= LIMITE_POR_HORA) {
            throw new IllegalArgumentException("Muitas tentativas neste horário. Aguarde um pouco e tente de novo.");
        }
        lista.add(agora);
    }

    private static String fingerprint(String telefone, VitrinePedidoDTO dto) {
        String tipo = dto.getTipoFluxo() == null ? "CONDICIONAL" : dto.getTipoFluxo().toUpperCase();
        List<VitrineItemDTO> itens = dto.getItens() == null ? List.of() : dto.getItens();
        String itensTxt = itens.stream()
                .sorted(Comparator
                        .comparing((VitrineItemDTO i) -> i.getProdutoId() == null ? 0L : i.getProdutoId())
                        .thenComparing(i -> nvl(i.getCorEscolhida()))
                        .thenComparing(i -> nvl(i.getTamanhoEscolhido())))
                .map(i -> i.getProdutoId() + ":" + nvl(i.getCorEscolhida()) + ":" + nvl(i.getTamanhoEscolhido()) + ":" + i.getQuantidade())
                .collect(Collectors.joining("|"));
        return telefone + "|" + tipo + "|" + itensTxt;
    }

    private static String nvl(String v) {
        return v == null ? "" : v.trim().toLowerCase();
    }
}
