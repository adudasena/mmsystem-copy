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
        Usuario existente = localizarPorTelefone(telefoneCliente);
        if (existente == null || existente.getDeletedAt() != null || !ehCliente(existente)) {
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
            Usuario existente = localizarPorTelefone(telefoneCliente);
            if (existente != null) {
                if (!ehCliente(existente)) {
                    throw new IllegalArgumentException(
                            "Este WhatsApp já está cadastrado na loja. Use outro número ou fale com a atendente.");
                }
                existente.setDeletedAt(null);
                if (existente.getPerfil() == null) {
                    existente.setPerfil(Perfil.ROLE_CLIENTE);
                }
                String digits = somenteDigitos(telefoneCliente);
                if (!digits.isEmpty()) {
                    existente.setTelefone(digits);
                }
                return aplicarNomeSeSolicitado(existente, nomeCliente, atualizarNome);
            }

            Usuario novoCliente = new Usuario();
            novoCliente.setNome(nomeCliente != null && !nomeCliente.trim().isEmpty()
                    ? nomeCliente.trim()
                    : "Cliente Vitrine");
            String soDigitos = somenteDigitos(telefoneCliente);
            novoCliente.setTelefone(soDigitos.isEmpty() ? telefoneCliente.trim() : soDigitos);
            novoCliente.setPerfil(Perfil.ROLE_CLIENTE);
            return repository.save(novoCliente);
        }

        throw new IllegalArgumentException("Informe o WhatsApp para identificar a cliente.");
    }

    private Usuario localizarPorTelefone(String telefoneCliente) {
        if (telefoneCliente == null || telefoneCliente.isBlank()) {
            return null;
        }
        for (String candidato : variantesTelefone(telefoneCliente)) {
            Usuario existente = repository.findByTelefone(candidato).orElse(null);
            if (existente != null) {
                return existente;
            }
        }
        String chave = chaveWhatsapp(somenteDigitos(telefoneCliente));
        if (chave.length() < 10) {
            return null;
        }
        for (Usuario candidato : repository.findAll()) {
            if (chave.equals(chaveWhatsapp(somenteDigitos(candidato.getTelefone())))) {
                return candidato;
            }
        }
        return null;
    }

    private String chaveWhatsapp(String digits) {
        if (digits == null || digits.isEmpty()) {
            return "";
        }
        return digits.length() > 11 ? digits.substring(digits.length() - 11) : digits;
    }

    private boolean ehCliente(Usuario usuario) {
        return usuario.getPerfil() == null || usuario.getPerfil() == Perfil.ROLE_CLIENTE;
    }

    private String somenteDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }

    private java.util.LinkedHashSet<String> variantesTelefone(String telefoneCliente) {
        java.util.LinkedHashSet<String> variantes = new java.util.LinkedHashSet<>();
        String trim = telefoneCliente.trim();
        variantes.add(trim);
        String digits = somenteDigitos(trim);
        if (!digits.isEmpty()) {
            variantes.add(digits);
            if (digits.startsWith("55") && digits.length() >= 12) {
                variantes.add(digits.substring(2));
            } else if (digits.length() == 10 || digits.length() == 11) {
                variantes.add("55" + digits);
            }
        }
        return variantes;
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