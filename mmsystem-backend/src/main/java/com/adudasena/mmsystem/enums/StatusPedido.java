package com.adudasena.mmsystem.enums;

public enum StatusPedido {
    AGUARDANDO_PAGAMENTO,
    PENDENTE,          // legado - banco ainda tem registros com esse valor
    CANCELADO,
    CONCLUIDO,
    PAGO               // legado - banco ainda tem registros com esse valor
}