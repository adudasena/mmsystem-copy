package com.adudasena.mmsystem.service;

import com.adudasena.mmsystem.dto.AvisosVencimentoResultadoDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.model.Condicional;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.CondicionalRepository;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AvisosVencimentoServiceTest {

    @Autowired
    private AvisosVencimentoService avisosVencimentoService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private CondicionalRepository condicionalRepository;

    @BeforeEach
    void limpar() {
        condicionalRepository.deleteAll();
        usuarioRepository.deleteAll();
    }

    @Test
    void detectaSacolaVencendoMasNaoEnviaSemEvolution() {
        Usuario cliente = new Usuario();
        cliente.setNome("Ana Cliente");
        cliente.setTelefone("43988887777");
        cliente.setEmail("ana.aviso@teste.com");
        cliente.setPerfil(Perfil.ROLE_CLIENTE);
        usuarioRepository.save(cliente);

        Condicional sacola = new Condicional();
        sacola.setUsuario(cliente);
        sacola.setDataSaida(LocalDate.now().minusDays(2));
        sacola.setDataRetorno(LocalDate.now());
        sacola.setStatus("ABERTA");
        sacola.setValorTotal(BigDecimal.TEN);
        condicionalRepository.save(sacola);

        AvisosVencimentoResultadoDTO r = avisosVencimentoService.processarAvisosDoDia();

        assertFalse(r.whatsappLigado());
        assertEquals(1, r.condicionaisVencendo());
        assertEquals(0, r.enviados());
        assertNull(condicionalRepository.findById(sacola.getId()).orElseThrow().getWhatsappAvisoVencimentoEm());
    }

    @Test
    void montaTextoDeVencimentoDaSacola() {
        Usuario cliente = new Usuario();
        cliente.setNome("Ana Silva");
        String texto = AvisosVencimentoService.mensagemCondicional(
                cliente, 12L, LocalDate.of(2026, 10, 9), false);
        assertEquals(
                "Oi, Ana! Sua sacola #12 na Maria Morena vence em 09/10/2026. Qualquer dúvida, fale com a gente.",
                texto);
    }
}
