package com.adudasena.mmsystem.config;

import com.adudasena.mmsystem.enums.Perfil;
import com.adudasena.mmsystem.model.Usuario;
import com.adudasena.mmsystem.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProprietariaBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProprietariaBootstrap.class);

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.email:}")
    private String email;

    @Value("${app.bootstrap.senha:}")
    private String senha;

    @Value("${app.bootstrap.telefone:}")
    private String telefone;

    @Value("${app.bootstrap.nome:Proprietária Maria Morena}")
    private String nome;

    @Override
    public void run(ApplicationArguments args) {
        String tel = telefone == null ? "" : telefone.replaceAll("\\D", "");
        if (email == null || email.isBlank() || senha == null || senha.isBlank() || tel.length() < 10) {
            return;
        }
        if (usuarioRepository.findFirstByPerfilAndDeletedAtIsNull(Perfil.ROLE_PROPRIETARIA).isPresent()) {
            return;
        }
        Usuario dona = new Usuario();
        dona.setNome(nome.isBlank() ? "Proprietária Maria Morena" : nome.trim());
        dona.setEmail(email.trim());
        dona.setTelefone(tel);
        dona.setSenha(passwordEncoder.encode(senha));
        dona.setPerfil(Perfil.ROLE_PROPRIETARIA);
        usuarioRepository.save(dona);
        log.info("Proprietária inicial criada para o ambiente na nuvem (e-mail {}).", dona.getEmail());
    }
}
