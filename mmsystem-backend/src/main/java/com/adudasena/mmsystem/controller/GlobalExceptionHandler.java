package com.adudasena.mmsystem.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        logger.error("Violação de integridade de dados: ", ex);
        Map<String, String> erro = new HashMap<>();
        erro.put("mensagem", "Não foi possível concluir a ação: este registro possui vínculos com outros lançamentos no sistema.");
        erro.put("erro", "Dados em conflito ou vinculados");
        return ResponseEntity.status(HttpStatus.CONFLICT).body(erro);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> erro = new HashMap<>();
        String primeiraMensagem = ex.getBindingResult().getAllErrors().isEmpty()
                ? "Dados inválidos fornecidos."
                : ex.getBindingResult().getAllErrors().get(0).getDefaultMessage();
        erro.put("mensagem", primeiraMensagem);
        erro.put("erro", "Validação de dados");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        logger.warn("Argumento inválido: {}", ex.getMessage());
        Map<String, String> erro = new HashMap<>();
        erro.put("mensagem", ex.getMessage() != null ? ex.getMessage() : "Parâmetros inválidos.");
        erro.put("erro", "Requisição inválida");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        logger.error("Erro em tempo de execução: ", ex);
        Map<String, String> erro = new HashMap<>();
        String msg = ex.getMessage();
        if (msg == null || msg.contains("org.hibernate") || msg.contains("SQL") || msg.contains("ConstraintViolationException")) {
            msg = "Não foi possível concluir a operação. Verifique as informações fornecidas.";
        }
        erro.put("mensagem", msg);
        erro.put("erro", "Erro no processamento");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(erro);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralException(Exception ex) {
        logger.error("Exceção não tratada capturada pelo controlador global: ", ex);
        Map<String, String> erro = new HashMap<>();
        erro.put("mensagem", "Ocorreu um erro inesperado no sistema. Por favor, tente novamente.");
        erro.put("erro", "Erro interno do servidor");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(erro);
    }
}

