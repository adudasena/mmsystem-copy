package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Produto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    List<Produto> findByDeletedAtIsNull();
    Page<Produto> findByDeletedAtIsNull(Pageable pageable);
    Page<Produto> findByDeletedAtIsNullAndStatusIgnoreCase(String status, Pageable pageable);
    Page<Produto> findByDeletedAtIsNullAndStatusIgnoreCaseAndCategoriaIgnoreCase(String status, String categoria, Pageable pageable);

    Optional<Produto> findByIdAndDeletedAtIsNull(Long id);

    List<Produto> findByDeletedAtIsNotNull();
    Page<Produto> findByDeletedAtIsNotNull(Pageable pageable);

    @Query("""
            SELECT DISTINCT p.categoria FROM Produto p
            WHERE p.deletedAt IS NULL
              AND UPPER(p.status) = 'DISPONIVEL'
              AND p.categoria IS NOT NULL AND p.categoria <> ''
            ORDER BY p.categoria
            """)
    List<String> listarCategoriasVitrine();

    @Query("""
            SELECT DISTINCT p.categoria FROM Produto p
            WHERE p.deletedAt IS NULL
              AND p.categoria IS NOT NULL AND p.categoria <> ''
            ORDER BY p.categoria
            """)
    List<String> listarCategoriasEmUso();
}