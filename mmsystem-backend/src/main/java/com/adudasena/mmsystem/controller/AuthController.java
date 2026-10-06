package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.dto.LoginRequestDTO;
import com.adudasena.mmsystem.dto.UsuarioDTO;
import com.adudasena.mmsystem.dto.UsuarioResponseDTO;
import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import com.adudasena.mmsystem.security.JwtService;
import com.adudasena.mmsystem.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@lombok.RequiredArgsConstructor
public class AuthController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UsuarioService usuarioService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequestDTO body) {
        Usuario usuario = usuarioRepository.findByEmail(body.email()).orElse(null);

        if (usuario == null
                || usuario.getDeletedAt() != null
                || usuario.getSenha() == null
                || !passwordEncoder.matches(body.senha(), usuario.getSenha())) {
            return ResponseEntity.status(401).body(Map.of(
                    "erro", "Unauthorized",
                    "mensagem", "E-mail ou senha inválidos."
            ));
        }

        if (usuario.getPerfil() != Perfil.ROLE_PROPRIETARIA && usuario.getPerfil() != Perfil.ROLE_FUNCIONARIO) {
            return ResponseEntity.status(403).body(Map.of(
                    "erro", "Forbidden",
                    "mensagem", "Acesso restrito ao painel administrativo."
            ));
        }

        String token = jwtService.gerarToken(usuario.getEmail(), usuario.getPerfil());

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("token", token);
        resposta.put("expiraEmMs", jwtService.getExpiracaoMs());
        resposta.put("usuario", usuario.getNome());
        resposta.put("email", usuario.getEmail());
        resposta.put("perfil", usuario.getPerfil() != null ? usuario.getPerfil().name() : null);

        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/registrar")
    public ResponseEntity<?> registrarCliente(@Valid @RequestBody UsuarioDTO dto) {
        if (dto.getEmail() != null && usuarioRepository.findByEmail(dto.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "erro", "Validação de dados",
                    "mensagem", "E-mail já cadastrado."
            ));
        }

        dto.setPerfil(Perfil.ROLE_CLIENTE.name());
        return ResponseEntity.status(201).body(UsuarioResponseDTO.from(usuarioService.salvar(dto)));
    }
}
