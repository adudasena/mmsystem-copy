package com.adudasena.mmsystem.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.adudasena.mmsystem.dto.UsuarioDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public Page<Usuario> listarTodos(Pageable pageable) {
        return repository.findByDeletedAtIsNull(pageable);
    }

    public List<Usuario> listarTodos() {
        return repository.findByDeletedAtIsNull();
    }

    public Usuario buscarPorId(Long id) {
        return repository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Cliente/Usuário não encontrado com o ID: " + id));
    }

    public Usuario salvar(UsuarioDTO dto) {
        Usuario usuario = new Usuario();
        copiarDtoParaEntidade(dto, usuario);
        return repository.save(usuario);
    }

    public Usuario atualizar(Long id, UsuarioDTO dto) {
        Usuario usuario = buscarPorId(id);
        copiarDtoParaEntidade(dto, usuario);
        return repository.save(usuario);
    }

    public void excluir(Long id) {
        Usuario usuario = buscarPorId(id);
        usuario.setDeletedAt(LocalDateTime.now()); // Soft Delete
        repository.save(usuario);
    }

    private void copiarDtoParaEntidade(UsuarioDTO dto, Usuario usuario) {
        usuario.setNome(dto.getNome());
        usuario.setTelefone(dto.getTelefone());
        usuario.setEmail(dto.getEmail());

        // Converte a String do DTO para o Enum Perfil ou define o valor padrão ROLE_CLIENTE
        if (dto.getPerfil() != null && !dto.getPerfil().isBlank()) {
            try {
                // Tenta converter diretamente (Ex: "ROLE_CLIENTE", "ROLE_PROPRIETARIA")
                usuario.setPerfil(Perfil.valueOf(dto.getPerfil().toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Caso venha algo como "CLIENTE" ou "PROPRIETARIA" sem o prefixo
                String perfilFormatado = dto.getPerfil().toUpperCase().startsWith("ROLE_")
                        ? dto.getPerfil().toUpperCase()
                        : "ROLE_" + dto.getPerfil().toUpperCase();
                try {
                    usuario.setPerfil(Perfil.valueOf(perfilFormatado));
                } catch (IllegalArgumentException ex) {
                    usuario.setPerfil(Perfil.ROLE_CLIENTE);
                }
            }
        } else if (usuario.getPerfil() == null) {
            usuario.setPerfil(Perfil.ROLE_CLIENTE);
        }

        // Criptografa a senha se ela tiver sido enviada
        if (dto.getSenha() != null && !dto.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(dto.getSenha()));
        }
    }
}