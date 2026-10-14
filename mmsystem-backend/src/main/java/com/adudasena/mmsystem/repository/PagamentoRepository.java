package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.enums.MetodoPagamento;
import com.adudasena.mmsystem.enums.StatusPagamento;
import com.adudasena.mmsystem.model.Pagamento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {
    List<Pagamento> findByDeletedAtIsNull();
    Page<Pagamento> findByDeletedAtIsNull(Pageable pageable);
    List<Pagamento> findByDeletedAtIsNotNull();
    Page<Pagamento> findByDeletedAtIsNotNull(Pageable pageable);

    Page<Pagamento> findByDeletedAtIsNullAndStatusAndMetodoPagamentoAndDataVencimentoLessThanEqual(
            StatusPagamento status,
            MetodoPagamento metodoPagamento,
            LocalDate dataLimite,
            Pageable pageable
    );

    long countByDeletedAtIsNullAndStatusAndMetodoPagamentoAndDataVencimentoLessThanEqual(
            StatusPagamento status,
            MetodoPagamento metodoPagamento,
            LocalDate dataLimite
    );

    @Query("SELECT DISTINCT p.status FROM Pagamento p WHERE p.deletedAt IS NULL")
    List<StatusPagamento> listarStatusAtivos();
}
