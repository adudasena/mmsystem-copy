package com.adudasena.mmsystem.dto;

public record AvisosVencimentoResultadoDTO(
        int condicionaisVencendo,
        int condicionaisAtrasadas,
        int pagamentosVencendo,
        int pagamentosAtrasados,
        int enviados,
        boolean whatsappLigado
) {}
