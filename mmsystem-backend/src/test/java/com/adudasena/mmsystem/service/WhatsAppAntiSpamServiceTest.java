package com.adudasena.mmsystem.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WhatsAppAntiSpamServiceTest {

    @Test
    void reconheceNumeroComESemNove() {
        assertTrue(WhatsAppAntiSpamService.mesmoWhatsApp("43999998888", "(43) 99999-8888"));
        assertTrue(WhatsAppAntiSpamService.mesmoWhatsApp("5543999998888", "43999998888"));
        assertTrue(WhatsAppAntiSpamService.mesmoWhatsApp("5541999887766", "41999887766"));
        assertFalse(WhatsAppAntiSpamService.mesmoWhatsApp("43999998888", "44999998888"));
    }

    @Test
    void numeroEvolutionIncluiNoveEDdi() {
        org.junit.jupiter.api.Assertions.assertEquals("5543999502889", WhatsAppService.numeroEvolution("4399502889"));
        org.junit.jupiter.api.Assertions.assertEquals("5543999188802", WhatsAppService.numeroEvolution("43999188802"));
    }
}
