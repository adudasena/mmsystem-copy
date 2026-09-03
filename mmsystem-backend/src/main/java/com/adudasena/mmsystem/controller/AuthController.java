package com.adudasena.mmsystem.controller;

import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import com.adudasena.mmsystem.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    // ─── LOGIN ─────────────────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String senha = body.get("senha");

        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        if (usuario == null || usuario.getSenha() == null || !passwordEncoder.matches(senha, usuario.getSenha())) {
            return ResponseEntity.status(401).body("E-mail ou senha inválidos.");
        }

        String token = jwtService.gerarToken(usuario.getEmail(), usuario.getPerfil());

        Map<String, Object> resposta = new HashMap<>();
        resposta.put("token", token);
        resposta.put("usuario", usuario.getNome());
        resposta.put("email", usuario.getEmail());
        resposta.put("perfil", usuario.getPerfil());

        return ResponseEntity.ok(resposta);
    }

    // ─── CADASTRO DE CLIENTE (PÚBLICO) ────────────────────────────────────
    @PostMapping("/registrar")
    public ResponseEntity<?> registrarCliente(@RequestBody Usuario usuario) {
        if (usuario.getEmail() != null && usuarioRepository.findByEmail(usuario.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("E-mail já cadastrado.");
        }

        usuario.setPerfil(Perfil.ROLE_CLIENTE);

        // Criptografa a senha
        if (usuario.getSenha() != null && !usuario.getSenha().isBlank()) {
            usuario.setSenha(passwordEncoder.encode(usuario.getSenha()));
        }

        Usuario salvo = usuarioRepository.save(usuario);
        return ResponseEntity.ok(salvo);
    }
}