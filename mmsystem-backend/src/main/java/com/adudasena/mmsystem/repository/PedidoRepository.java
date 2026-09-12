package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    Page<Pedido> findByDeletedAtIsNull(Pageable pageable);
    Page<Pedido> findByDeletedAtIsNotNull(Pageable pageable);
    Optional<Pedido> findByIdAndDeletedAtIsNull(Long id);
}
