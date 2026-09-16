package com.adudasena.mmsystem.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class ProdutoDTO {
    @NotBlank(message = "O nome do produto é obrigatório.")
    @Size(min = 2, max = 80, message = "O nome deve conter entre 2 e 80 caracteres.")
    private String nome;

    @NotBlank(message = "A categoria é obrigatória.")
    private String categoria;

    @Size(max = 500, message = "A descrição não pode passar de 500 caracteres.")
    private String descricao;

    @NotNull(message = "O preço é obrigatório.")
    @DecimalMin(value = "0.01", message = "O preço deve ser maior que zero.")
    private BigDecimal preco;

    @NotEmpty(message = "Selecione pelo menos uma cor.")
    private List<String> coresSelecionadas;

    @NotEmpty(message = "Selecione pelo menos um tamanho.")
    private List<String> tamanhosSelecionados;

    @NotEmpty(message = "A grade de estoque deve ser preenchida.")
    private Map<String, @Min(value = 0, message = "A quantidade de estoque não pode ser negativa.") Integer> estoqueDetalhado;

    @NotEmpty(message = "É obrigatório adicionar pelo menos uma foto.")
    private List<String> fotos;

    private String status;
}