package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Tamanho;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TamanhoRepository extends JpaRepository<Tamanho, Long> {
    List<Tamanho> findByDeletedAtIsNull();
}
