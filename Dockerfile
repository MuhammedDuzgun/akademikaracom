FROM eclipse-temurin:21

LABEL authors="MUHAMMED"

WORKDIR /app

COPY target/akademikaracom-0.0.1-SNAPSHOT.jar /app/akademikaracom-0.0.1-SNAPSHOT.jar

ENTRYPOINT ["java", "-jar", "akademikaracom-0.0.1-SNAPSHOT.jar", "--spring.profiles.active=prod"]