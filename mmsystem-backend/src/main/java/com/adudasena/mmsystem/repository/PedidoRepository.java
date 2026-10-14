package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.enums.StatusPedido;
import com.adudasena.mmsystem.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    Page<Pedido> findByDeletedAtIsNull(Pageable pageable);
    Page<Pedido> findByDeletedAtIsNotNull(Pageable pageable);
    Optional<Pedido> findByIdAndDeletedAtIsNull(Long id);

    @Query("SELECT DISTINCT p.status FROM Pedido p WHERE p.deletedAt IS NULL")
    List<StatusPedido> listarStatusAtivos();
}
