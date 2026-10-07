package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findByDeletedAtIsNull();
}
