package com.adudasena.mmsystem.repository;

import com.adudasena.mmsystem.model.Cor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CorRepository extends JpaRepository<Cor, Long> {
    List<Cor> findByDeletedAtIsNull();
}
