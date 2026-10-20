package com.adudasena.mmsystem.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CaptchaServiceTest {

    @Test
    void secretVaziaNaoExigeToken() {
        CaptchaService service = new CaptchaService(false, "", "turnstile");
        assertDoesNotThrow(() -> service.validar(null, null));
    }

    @Test
    void secretPreenchidaRecusaTokenVazioMesmoComEnabledFalse() {
        CaptchaService service = new CaptchaService(false, "teste-secret", "turnstile");
        assertThrows(IllegalArgumentException.class, () -> service.validar(" ", "127.0.0.1"));
    }
}
