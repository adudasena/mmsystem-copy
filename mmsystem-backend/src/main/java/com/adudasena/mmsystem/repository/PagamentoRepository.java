package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Pagamento;
import com.adudasena.mmsystem.model.Produto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {
    List<Pagamento> findByDeletedAtIsNull();
    Page<Pagamento> findByDeletedAtIsNull(Pageable pageable);
    List<Pagamento> findByDeletedAtIsNotNull();
    Page<Pagamento> findByDeletedAtIsNotNull(Pageable pageable);
}
