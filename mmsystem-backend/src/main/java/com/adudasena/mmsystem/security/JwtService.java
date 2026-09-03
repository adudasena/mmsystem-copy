package com.adudasena.mmsystem.security;

import com.adudasena.mmsystem.enums.Perfil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.util.Date;

@Service
public class JwtService {

    private static final Key CHAVE = Keys.secretKeyFor(SignatureAlgorithm.HS256);
    private static final long EXPIRACAO = 86400000; // 24 horas

    public String gerarToken(String email, Perfil perfil) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", perfil != null ? perfil.name() : Perfil.ROLE_CLIENTE.name())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRACAO))
                .signWith(CHAVE)
                .compact();
    }

    public String obterEmailDoToken(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(CHAVE)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public boolean validarToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(CHAVE).build().parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}