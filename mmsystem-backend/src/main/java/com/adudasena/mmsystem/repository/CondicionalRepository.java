package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Condicional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CondicionalRepository extends JpaRepository<Condicional, Long> {
    List<Condicional> findByDeletedAtIsNull();
    List<Condicional> findByDeletedAtIsNotNull();
    Optional<Condicional> findByIdAndDeletedAtIsNull(Long id);

    Page<Condicional> findByDeletedAtIsNull(Pageable pageable);
    Page<Condicional> findByDeletedAtIsNotNull(Pageable pageable);
    Page<Condicional> findByDeletedAtIsNullAndStatusIgnoreCase(String status, Pageable pageable);
    Page<Condicional> findByDeletedAtIsNullAndStatusIgnoreCaseIn(Collection<String> status, Pageable pageable);

    @Query("""
            SELECT CASE WHEN COUNT(c) > 0 THEN true ELSE false END
            FROM Condicional c JOIN c.itens i
            WHERE c.deletedAt IS NULL
              AND UPPER(c.status) = 'ABERTA'
              AND i.produto.id = :produtoId
            """)
    boolean existsSacolaAbertaComProduto(@Param("produtoId") Long produtoId);

    @Query("SELECT DISTINCT c.status FROM Condicional c WHERE c.deletedAt IS NULL")
    List<String> listarStatusAtivos();

    boolean existsByDeletedAtIsNullAndStatusIgnoreCaseAndDataRetornoLessThanEqual(String status, LocalDate data);
}