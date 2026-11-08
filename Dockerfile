FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /build
COPY pom.xml ./
COPY src ./src
# Compile current source rather than packaging an old host-side target JAR.
# Tests run separately against the configured test/database environment.
RUN --mount=type=cache,target=/root/.m2 mvn -B package -DskipTests

FROM eclipse-temurin:21-jre

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system docflow && useradd --system --gid docflow docflow

WORKDIR /app

COPY --from=build --chown=docflow:docflow /build/target/docflow-0.0.1-SNAPSHOT.jar app.jar
USER docflow

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
