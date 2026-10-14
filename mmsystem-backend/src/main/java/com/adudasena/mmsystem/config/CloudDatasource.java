package com.adudasena.mmsystem.config;

import java.net.URI;

/**
 * Railway/Coolify expõem DATABASE_URL (postgres://...).
 * O Spring espera jdbc:postgresql://. Não altera o Postgres local.
 */
public final class CloudDatasource {

    private CloudDatasource() {}

    public static void aplicarSeNecessario() {
        if (preenchido(System.getenv("SPRING_DATASOURCE_URL"))
                || preenchido(System.getProperty("spring.datasource.url"))) {
            return;
        }
        String raw = System.getenv("DATABASE_URL");
        if (!preenchido(raw)) {
            return;
        }
        try {
            String normalizado = raw.trim();
            if (normalizado.startsWith("postgres://")) {
                normalizado = "postgresql://" + normalizado.substring("postgres://".length());
            }
            URI uri = URI.create(normalizado);
            String userInfo = uri.getUserInfo();
            String user = "";
            String pass = "";
            if (userInfo != null && !userInfo.isBlank()) {
                int sep = userInfo.indexOf(':');
                if (sep >= 0) {
                    user = userInfo.substring(0, sep);
                    pass = userInfo.substring(sep + 1);
                } else {
                    user = userInfo;
                }
            }
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath() == null ? "" : uri.getPath();
            String db = path.startsWith("/") ? path.substring(1) : path;
            String query = uri.getQuery();
            String jdbc = "jdbc:postgresql://" + uri.getHost() + ":" + port + "/" + db;
            if (query == null || query.isBlank()) {
                jdbc += "?sslmode=require";
            } else {
                jdbc += "?" + query;
                if (!query.contains("sslmode")) {
                    jdbc += "&sslmode=require";
                }
            }
            System.setProperty("spring.datasource.url", jdbc);
            if (!user.isBlank()) {
                System.setProperty("spring.datasource.username", user);
            }
            System.setProperty("spring.datasource.password", pass);
        } catch (Exception ignored) {
            // Mantém application.properties (local).
        }
    }

    private static boolean preenchido(String valor) {
        return valor != null && !valor.isBlank();
    }
}
