package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.AvisosVencimentoResultadoDTO;
import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
import com.adudasena.mmsystem.enums.StatusPagamento;
import com.adudasena.mmsystem.model.Condicional;
import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.model.Pedido;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.PagamentoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AvisosVencimentoService {

    private static final Logger logger = LoggerFactory.getLogger(AvisosVencimentoService.class);
    private static final DateTimeFormatter DATA_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CondicionalRepository condicionalRepository;
    private final PagamentoRepository pagamentoRepository;
    private final WhatsAppService whatsAppService;
    private final int diasAntecedencia;

    public AvisosVencimentoService(
            CondicionalRepository condicionalRepository,
            PagamentoRepository pagamentoRepository,
            WhatsAppService whatsAppService,
            @Value("${app.whatsapp.avisos.dias-antecedencia:1}") int diasAntecedencia
    ) {
        this.condicionalRepository = condicionalRepository;
        this.pagamentoRepository = pagamentoRepository;
        this.whatsAppService = whatsAppService;
        this.diasAntecedencia = Math.max(0, diasAntecedencia);
    }

    @Transactional
    public AvisosVencimentoResultadoDTO processarAvisosDoDia() {
        LocalDate hoje = LocalDate.now();
        LocalDate limiteVencendo = hoje.plusDays(diasAntecedencia);
        LocalDateTime agora = LocalDateTime.now();
        boolean whatsappLigado = whatsAppService.isEnabled();

        int condVencendo = 0;
        int condAtraso = 0;
        int pagVencendo = 0;
        int pagAtraso = 0;
        int enviados = 0;

        List<Condicional> condicionais = condicionalRepository.findByDeletedAtIsNull();
        for (Condicional c : condicionais) {
            if (c == null || !"ABERTA".equalsIgnoreCase(c.getStatus()) || c.getDataRetorno() == null) {
                continue;
            }
            Usuario cliente = c.getUsuario();
            LocalDate prazo = c.getDataRetorno();
            if (prazo.isBefore(hoje) && c.getWhatsappAvisoAtrasoEm() == null) {
                condAtraso++;
                if (enviar(cliente, mensagemCondicional(cliente, c.getId(), prazo, true), whatsappLigado)) {
                    c.setWhatsappAvisoAtrasoEm(agora);
                    enviados++;
                }
            } else if (!prazo.isBefore(hoje) && !prazo.isAfter(limiteVencendo)
                    && c.getWhatsappAvisoVencimentoEm() == null) {
                condVencendo++;
                if (enviar(cliente, mensagemCondicional(cliente, c.getId(), prazo, false), whatsappLigado)) {
                    c.setWhatsappAvisoVencimentoEm(agora);
                    enviados++;
                }
            }
        }

        List<Pagamento> pagamentos = pagamentoRepository.findByDeletedAtIsNull();
        for (Pagamento p : pagamentos) {
            if (p == null || p.getStatus() != StatusPagamento.PENDENTE || p.getDataVencimento() == null) {
                continue;
            }
            Usuario cliente = clienteDoPagamento(p);
            LocalDate prazo = p.getDataVencimento();
            Long pedidoId = p.getPedido() != null ? p.getPedido().getId() : null;
            if (prazo.isBefore(hoje) && p.getWhatsappAvisoAtrasoEm() == null) {
                pagAtraso++;
                if (enviar(cliente, mensagemPagamento(cliente, pedidoId, prazo, true), whatsappLigado)) {
                    p.setWhatsappAvisoAtrasoEm(agora);
                    enviados++;
                }
            } else if (!prazo.isBefore(hoje) && !prazo.isAfter(limiteVencendo)
                    && p.getWhatsappAvisoVencimentoEm() == null) {
                pagVencendo++;
                if (enviar(cliente, mensagemPagamento(cliente, pedidoId, prazo, false), whatsappLigado)) {
                    p.setWhatsappAvisoVencimentoEm(agora);
                    enviados++;
                }
            }
        }

        if (!whatsappLigado && (condVencendo + condAtraso + pagVencendo + pagAtraso) > 0) {
            logger.info("Avisos de vencimento prontos, mas Evolution está desligada. "
                    + "Nada foi enviado. Ligue app.whatsapp.enabled e a Evolution para disparar.");
        }

        return new AvisosVencimentoResultadoDTO(
                condVencendo, condAtraso, pagVencendo, pagAtraso, enviados, whatsappLigado);
    }

    private boolean enviar(Usuario cliente, String texto, boolean whatsappLigado) {
        if (!whatsappLigado || cliente == null || cliente.getTelefone() == null || cliente.getTelefone().isBlank()) {
            return false;
        }
        return whatsAppService.enviar(new WhatsAppMensagemDTO(cliente.getTelefone(), texto));
    }

    private static Usuario clienteDoPagamento(Pagamento p) {
        Pedido pedido = p.getPedido();
        return pedido != null ? pedido.getCliente() : null;
    }

    private static String nome(Usuario cliente) {
        if (cliente == null || cliente.getNome() == null || cliente.getNome().isBlank()) {
            return "oi";
        }
        return cliente.getNome().split(" ")[0];
    }

    static String mensagemCondicional(Usuario cliente, Long id, LocalDate prazo, boolean atrasada) {
        String data = prazo.format(DATA_BR);
        if (atrasada) {
            return "Oi, " + nome(cliente) + "! Sua sacola #" + id + " na Maria Morena venceu em " + data
                    + ". Combine a devolução com a loja, por favor.";
        }
        return "Oi, " + nome(cliente) + "! Sua sacola #" + id + " na Maria Morena vence em " + data
                + ". Qualquer dúvida, fale com a gente.";
    }

    static String mensagemPagamento(Usuario cliente, Long pedidoId, LocalDate prazo, boolean atrasado) {
        String data = prazo.format(DATA_BR);
        String ref = pedidoId != null ? " do pedido #" + pedidoId : "";
        if (atrasado) {
            return "Oi, " + nome(cliente) + "! O pagamento" + ref + " na Maria Morena venceu em " + data
                    + ". Combine a quitação com a loja, por favor.";
        }
        return "Oi, " + nome(cliente) + "! O pagamento" + ref + " na Maria Morena vence em " + data
                + ". Qualquer dúvida, fale com a gente.";
    }
}
