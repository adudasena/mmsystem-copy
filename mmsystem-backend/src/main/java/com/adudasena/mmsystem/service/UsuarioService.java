package com.adudasena.mmsystem.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.adudasena.mmsystem.dto.UsuarioDTO;
import com.adudasena.mmsystem.dto.VitrineClienteLookupDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@lombok.RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository repository;

    private final PasswordEncoder passwordEncoder;

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

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public VitrineClienteLookupDTO consultarClienteVitrine(String telefoneCliente) {
        Usuario existente = localizarClientePorTelefone(telefoneCliente);
        if (existente == null) {
            return new VitrineClienteLookupDTO(false, null);
        }
        return new VitrineClienteLookupDTO(true, existente.getNome());
    }

    @org.springframework.transaction.annotation.Transactional
    public Usuario buscarOuCriarClienteVitrine(Long usuarioId, String nomeCliente, String telefoneCliente) {
        return buscarOuCriarClienteVitrine(usuarioId, nomeCliente, telefoneCliente, false);
    }

    @org.springframework.transaction.annotation.Transactional
    public Usuario buscarOuCriarClienteVitrine(Long usuarioId, String nomeCliente, String telefoneCliente, boolean atualizarNome) {
        if (usuarioId != null) {
            Usuario existente = repository.findById(usuarioId).orElse(null);
            if (existente != null && existente.getDeletedAt() == null && existente.getPerfil() == Perfil.ROLE_CLIENTE) {
                return aplicarNomeSeSolicitado(existente, nomeCliente, atualizarNome);
            }
        }

        if (telefoneCliente != null && !telefoneCliente.trim().isEmpty()) {
            String telefone = telefoneCliente.trim();
            Usuario existente = localizarClientePorTelefone(telefone);
            if (existente != null) {
                existente.setDeletedAt(null);
                if (existente.getPerfil() == null) {
                    existente.setPerfil(Perfil.ROLE_CLIENTE);
                }
                return aplicarNomeSeSolicitado(existente, nomeCliente, atualizarNome);
            }

            Usuario novoCliente = new Usuario();
            novoCliente.setNome(nomeCliente != null && !nomeCliente.trim().isEmpty()
                    ? nomeCliente.trim()
                    : "Cliente Vitrine");
            String soDigitos = telefone.replaceAll("\\D", "");
            novoCliente.setTelefone(soDigitos.isEmpty() ? telefone : soDigitos);
            novoCliente.setPerfil(Perfil.ROLE_CLIENTE);
            return repository.save(novoCliente);
        }

        throw new IllegalArgumentException("Informe o WhatsApp para identificar a cliente.");
    }

    private Usuario localizarClientePorTelefone(String telefoneCliente) {
        if (telefoneCliente == null || telefoneCliente.isBlank()) {
            return null;
        }
        String telefone = telefoneCliente.trim();
        String soDigitos = telefone.replaceAll("\\D", "");
        Usuario existente = repository.findByTelefone(telefone).orElse(null);
        if (existente == null && !soDigitos.isEmpty() && !soDigitos.equals(telefone)) {
            existente = repository.findByTelefone(soDigitos).orElse(null);
        }
        if (existente == null || existente.getDeletedAt() != null) {
            return null;
        }
        if (existente.getPerfil() != Perfil.ROLE_CLIENTE) {
            return null;
        }
        return existente;
    }

    private Usuario aplicarNomeSeSolicitado(Usuario usuario, String nomeCliente, boolean atualizarNome) {
        if (atualizarNome && nomeCliente != null && !nomeCliente.trim().isEmpty()) {
            usuario.setNome(nomeCliente.trim());
            return repository.save(usuario);
        }
        return usuario;
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

    public Page<Usuario> listarExcluidos(Pageable pageable) {
        return repository.findByDeletedAtIsNotNull(pageable);
    }

    public void restaurar(Long id) {
        Usuario usuario = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente/Usuário não encontrado com o ID: " + id));
        usuario.setDeletedAt(null);
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