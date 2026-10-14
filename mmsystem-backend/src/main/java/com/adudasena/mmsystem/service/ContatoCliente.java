package com.adudasena.mmsystem.service;

final class ContatoCliente {

    private ContatoCliente() {}

    static String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    static String nomeLimpo(String valor) {
        if (valor == null) {
            return "";
        }
        return valor.trim().replaceAll("\\s+", " ");
    }

    static void validarNome(String valor) {
        String nome = nomeLimpo(valor);
        if (nome.length() < 2) {
            throw new IllegalArgumentException("Informe o nome completo (mínimo 2 letras).");
        }
        if (!nome.matches("[\\p{L}]+([ '.\\-][\\p{L}]+)*")) {
            throw new IllegalArgumentException("O nome deve ter só letras (sem números).");
        }
        if (nome.length() > 80) {
            throw new IllegalArgumentException("O nome deve ter no máximo 80 caracteres.");
        }
    }

    static String validarENormalizarWhatsApp(String valor) {
        String nums = somenteDigitos(valor);
        if (nums.startsWith("55") && nums.length() >= 12) {
            nums = nums.substring(2);
        }
        if (nums.length() < 10 || nums.length() > 11) {
            throw new IllegalArgumentException("Informe um WhatsApp válido com DDD (10 ou 11 dígitos).");
        }
        return nums;
    }
}
