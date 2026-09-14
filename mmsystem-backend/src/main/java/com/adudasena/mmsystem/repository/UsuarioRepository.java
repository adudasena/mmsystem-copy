package com.adudasena.mmsystem.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.adudasena.mmsystem.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    List<Usuario> findByDeletedAtIsNull();
    Page<Usuario> findByDeletedAtIsNull(Pageable pageable);
    List<Usuario> findByDeletedAtIsNotNull();
    Page<Usuario> findByDeletedAtIsNotNull(Pageable pageable);
    Optional<Usuario> findByIdAndDeletedAtIsNull(Long id);
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByTelefone(String telefone);
}