package com.adudasena.mmsystem.security;

import com.adudasena.mmsystem.enums.Perfil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    private final Key chave;
    private final long expiracaoMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expiracaoMs
    ) {
        this.chave = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiracaoMs = expiracaoMs;
    }

    public String gerarToken(String email, Perfil perfil) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", perfil != null ? perfil.name() : Perfil.ROLE_CLIENTE.name())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiracaoMs))
                .signWith(chave, SignatureAlgorithm.HS256)
                .compact();
    }

    public long getExpiracaoMs() {
        return expiracaoMs;
    }

    public String obterEmailDoToken(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean validarToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(chave)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
