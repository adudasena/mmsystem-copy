package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Condicional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface CondicionalRepository extends JpaRepository<Condicional, Long> {
    List<Condicional> findByDeletedAtIsNull();
    List<Condicional> findByDeletedAtIsNotNull();
    Optional<Condicional> findByIdAndDeletedAtIsNull(Long id);

    Page<Condicional> findByDeletedAtIsNull(Pageable pageable);
    Page<Condicional> findByDeletedAtIsNotNull(Pageable pageable);
}