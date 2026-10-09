package com.adudasena.mmsystem.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AvisosVencimentoScheduler {

    private static final Logger logger = LoggerFactory.getLogger(AvisosVencimentoScheduler.class);

    private final AvisosVencimentoService avisosVencimentoService;
    private final boolean enabled;

    public AvisosVencimentoScheduler(
            AvisosVencimentoService avisosVencimentoService,
            @Value("${app.whatsapp.avisos.enabled:true}") boolean enabled
    ) {
        this.avisosVencimentoService = avisosVencimentoService;
        this.enabled = enabled;
    }

    @Scheduled(cron = "0 0 9 * * *", zone = "America/Sao_Paulo")
    public void dispararDiario() {
        if (!enabled) {
            return;
        }
        try {
            avisosVencimentoService.processarAvisosDoDia();
        } catch (Exception e) {
            logger.error("Falha ao processar avisos de vencimento no WhatsApp: {}", e.getMessage(), e);
        }
    }
}
