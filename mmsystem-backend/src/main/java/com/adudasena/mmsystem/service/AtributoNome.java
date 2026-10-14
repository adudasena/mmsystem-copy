package com.adudasena.mmsystem.service;

import java.text.Normalizer;
import java.util.Locale;

final class AtributoNome {

    private AtributoNome() {}

    static String chave(String nome) {
        if (nome == null) {
            return "";
        }
        String n = Normalizer.normalize(nome.trim(), Normalizer.Form.NFD);
        n = n.replaceAll("\\p{M}+", "");
        n = n.toLowerCase(Locale.ROOT);
        n = n.replaceAll("[\\s\\-_./]+", "");
        return n;
    }

    static String compactarEspacos(String nome) {
        if (nome == null) {
            return "";
        }
        return nome.trim().replaceAll("\\s+", " ");
    }

    static String exibirCategoria(String nome) {
        String t = compactarEspacos(nome);
        validarRotulo(t, 40, "categoria");
        return maiusculaInicial(t);
    }

    static String exibirCor(String nome) {
        String t = compactarEspacos(nome);
        validarRotulo(t, 40, "cor");
        return maiusculaInicial(t);
    }

    static String exibirTamanho(String nome) {
        String t = nome == null ? "" : nome.trim().replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        if (t.isEmpty()) {
            throw new IllegalArgumentException("Informe o tamanho.");
        }
        if (t.length() > 12) {
            throw new IllegalArgumentException("O tamanho deve ter no máximo 12 caracteres.");
        }
        if (!t.matches("[\\p{L}\\p{N}]+")) {
            throw new IllegalArgumentException("Use só letras e números no tamanho (P, M, GG, 42).");
        }
        return t;
    }

    private static void validarRotulo(String t, int max, String tipo) {
        if (t.isEmpty()) {
            throw new IllegalArgumentException("Informe a " + tipo + ".");
        }
        if (t.length() > max) {
            throw new IllegalArgumentException("A " + tipo + " deve ter no máximo " + max + " caracteres.");
        }
        if (!t.matches(".*\\p{L}.*")) {
            throw new IllegalArgumentException("A " + tipo + " precisa ter ao menos uma letra.");
        }
    }

    private static String maiusculaInicial(String t) {
        return t.substring(0, 1).toUpperCase(Locale.ROOT) + t.substring(1);
    }
}
