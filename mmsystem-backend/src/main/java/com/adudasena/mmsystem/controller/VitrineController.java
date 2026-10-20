package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.CondicionalResponseDTO;
import com.adudasena.mmsystem.dto.PedidoResponseDTO;
import com.adudasena.mmsystem.dto.ProdutoResponseDTO;
import com.adudasena.mmsystem.dto.VitrineCheckoutResponseDTO;
import com.adudasena.mmsystem.dto.VitrineClienteLookupDTO;
import com.adudasena.mmsystem.dto.VitrineLojaDTO;
import com.adudasena.mmsystem.dto.VitrinePedidoDTO;
import com.adudasena.mmsystem.dto.WhatsAppMensagemDTO;
import com.adudasena.mmsystem.service.CaptchaService;
import com.adudasena.mmsystem.service.CondicionalService;
import com.adudasena.mmsystem.service.PedidoService;
import com.adudasena.mmsystem.service.ProdutoService;
import com.adudasena.mmsystem.service.UsuarioService;
import com.adudasena.mmsystem.service.VitrineProtecaoService;
import com.adudasena.mmsystem.service.WhatsAppService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/vitrine")
@RequiredArgsConstructor
public class VitrineController {

    private final CondicionalService condicionalService;
    private final PedidoService pedidoService;
    private final ProdutoService produtoService;
    private final WhatsAppService whatsAppService;
    private final UsuarioService usuarioService;
    private final CaptchaService captchaService;
    private final VitrineProtecaoService vitrineProtecaoService;

    @GetMapping("/produtos")
    public ResponseEntity<Page<ProdutoResponseDTO>> listarCatalogo(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String categoria
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("id").descending());
        return ResponseEntity.ok(produtoService.listarVitrine(pageable, categoria).map(ProdutoResponseDTO::from));
    }

    @GetMapping("/categorias")
    public ResponseEntity<List<String>> listarCategorias() {
        return ResponseEntity.ok(produtoService.listarCategoriasVitrine());
    }

    @GetMapping("/loja")
    public ResponseEntity<VitrineLojaDTO> contatoLoja() {
        return ResponseEntity.ok(usuarioService.contatoLojaVitrine());
    }

    @GetMapping("/cliente")
    public ResponseEntity<VitrineClienteLookupDTO> consultarCliente(
            @RequestParam(required = false) String telefone) {
        return ResponseEntity.ok(usuarioService.consultarClienteVitrine(telefone));
    }

    @PostMapping("/pedido")
    public ResponseEntity<VitrineCheckoutResponseDTO> criarPedidoVitrine(
            @Valid @RequestBody VitrinePedidoDTO dto,
            HttpServletRequest request
    ) {
        captchaService.validar(dto.getCaptchaToken(), ipCliente(request));
        vitrineProtecaoService.protegerCheckout(ipCliente(request), dto);
        String tipo = dto.getTipoFluxo() != null ? dto.getTipoFluxo().toUpperCase() : "CONDICIONAL";
        VitrineCheckoutResponseDTO resposta;
        if ("VENDA_DIRETA".equals(tipo)) {
            resposta = new VitrineCheckoutResponseDTO(
                    "VENDA_DIRETA",
                    null,
                    PedidoResponseDTO.from(pedidoService.processarVendaVitrine(dto))
            );
        } else {
            resposta = new VitrineCheckoutResponseDTO(
                    "CONDICIONAL",
                    CondicionalResponseDTO.from(condicionalService.processarPedidoVitrine(dto)),
                    null
            );
        }
        vitrineProtecaoService.marcarPedidoRegistrado(dto);
        notificarCliente(dto, tipo);
        return ResponseEntity.status(201).body(resposta);
    }

    private void notificarCliente(VitrinePedidoDTO dto, String tipo) {
        if (!whatsAppService.isEnabled()) {
            return;
        }
        String texto = "VENDA_DIRETA".equals(tipo)
                ? "Olá, " + dto.getNomeCliente() + "! Seu pedido na Maria Morena foi registrado. Em breve confirmamos o pagamento."
                : "Olá, " + dto.getNomeCliente() + "! Sua sacola condicional na Maria Morena foi registrada. Prazo de retorno: 3 dias.";
        boolean enviado = whatsAppService.enviar(new WhatsAppMensagemDTO(dto.getTelefoneCliente(), texto));
        if (!enviado) {
            org.slf4j.LoggerFactory.getLogger(VitrineController.class)
                    .info("Pedido da vitrine gravado, mas a notificação Evolution não foi enviada.");
        }
    }

    private static String ipCliente(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
