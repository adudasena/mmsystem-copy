# API Spring Boot 3 / Java 17. Mesmo arquivo para Railway e Coolify.
# No PC continue usando: mvn spring-boot:run (porta 8080).
#
# Variáveis na nuvem (não coloque senha neste arquivo):
#   SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD
#   APP_JWT_SECRET, APP_CORS_ALLOWED_ORIGINS, APP_WHATSAPP_ENABLED=false
# Railway define PORT; se não houver, a API usa 8080.

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN groupadd --system spring && useradd --system --gid spring spring
COPY --from=build /app/target/mmsystem-0.0.1-SNAPSHOT.jar app.jar
USER spring
EXPOSE 8080
ENV TZ=America/Sao_Paulo
ENTRYPOINT ["sh", "-c", "exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Dserver.port=${PORT:-8080} -jar app.jar"]
