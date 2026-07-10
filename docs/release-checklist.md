# Lista de publicación

Esta lista cubre la APK pública de piloto y el AAB posterior para Google Play. La firma es deliberadamente manual: ninguna clave, contraseña ni configuración de Firebase debe almacenarse en Git, GitHub Actions o los artefactos del repositorio.

## Requisitos locales

- Node.js 22 y `npm ci` completado.
- JDK 21. Aunque AGP 8 puede ejecutarse sobre Java 17, Capacitor 8.4.1 y sus plugins Android fijados en este proyecto compilan con `JavaVersion.VERSION_21`; por eso Java 21 sustituye la recomendación genérica de JDK 17.
- Android SDK 36 y Build Tools 36.0.0.
- `apksigner`, `apkanalyzer`, `adb` y `sha256sum` disponibles.
- Clave de firma almacenada fuera del repositorio, con copia de seguridad cifrada y acceso restringido.
- Para probar Firebase, `android/app/google-services.json` local. El archivo está ignorado por Git y el proyecto compila sin él.

## Antes de compilar

- [ ] El árbol que se va a publicar corresponde al commit y tag previstos.
- [ ] `git status --short` no contiene claves, `google-services.json`, `.env` ni otros secretos.
- [ ] `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm audit --omit=dev --audit-level=high` y `npm run build` finalizan correctamente.
- [ ] `npx cap sync android` no introduce cambios inesperados.
- [ ] `cd android && ./gradlew --no-daemon lint test assembleDebug` finaliza correctamente.
- [ ] La política pública y la declaración Data safety coinciden con la versión de la app.
- [ ] El titular ha confirmado los datos legales y un canal privado de contacto antes de cualquier distribución externa.

## Privacidad y Firebase

- [ ] Analytics y Crashlytics permanecen desactivados en una instalación limpia antes del consentimiento.
- [ ] Rechazar el consentimiento no genera eventos ni informes de fallos.
- [ ] Aceptar activa solo los eventos documentados; activar o retirar el permiso se completa tras reiniciar la aplicación.
- [ ] No se envían historial, relatos, estimaciones del desafío, identificadores personalizados ni datos introducidos por la persona usuaria.
- [ ] La retención de Analytics está configurada a 2 meses y se ha revisado la retención publicada de Crashlytics.
- [ ] La recogida del identificador publicitario y las señales de personalización permanece desactivada.

## APK piloto firmada

1. En Android Studio, abre `android/`, selecciona **Build > Generate Signed App Bundle or APK**, elige **APK** y la variante `release`.
2. Selecciona la clave externa y escribe sus credenciales únicamente en el diálogo local. No generes ni copies `keystore.properties` al repositorio.
3. Verifica la firma y prepara el hash:

   ```bash
   EXPECTED_SIGNER_SHA256="HUELLA_SHA256_APROBADA" \
     EXPECTED_VERSION_CODE="1" \
     scripts/prepare-pilot-release.sh android/app/release/app-release.apk piramide-bird-0.1.0-pilot.1.apk
   ```

4. Instala la APK resultante con `adb install --replace RUTA_APK` en, al menos, Android API 24 y API 36.
5. Ejecuta la guía de `docs/pilot-testing.md`, incluida la prueba sin conexión, segundo plano, reinicio, exportación y consentimiento.
6. Crea un tag anotado desde el commit verificado y publícalo como _prerelease_. Adjunta exclusivamente la APK y su `.sha256`:

   ```bash
   gh release create v0.1.0-pilot.1 RUTA_APK RUTA_APK.sha256 --prerelease --generate-notes
   ```

- [ ] El SHA-256 descargado desde GitHub coincide con el publicado.
- [ ] La página de la release avisa de que es una versión piloto y enlaza la política de privacidad y la guía de incidencias.
- [ ] La página avisa de que una APK instalada desde GitHub puede no actualizarse directamente a la compilación firmada por Google Play; el recorrido de actualización hasta producción se prueba en la pista interna de Play.
- [ ] No quedan incidencias críticas, de privacidad o de contenido PRL abiertas antes de promover la versión.

## AAB para Google Play

- [ ] Se incrementó `versionCode` y la versión visible es correcta.
- [ ] El AAB se firmó con la clave de carga respaldada y Play App Signing está habilitado para que Google proteja la clave de firma de la aplicación.
- [ ] Las huellas de los certificados de carga y de firma de la aplicación están registradas por separado y se ha verificado cuál firma cada canal.
- [ ] La ficha está en español, declara el carácter educativo y no presenta la adaptación fatal como modelo histórico de Bird.
- [ ] Capturas, icono, descripción, URL de privacidad y correo/canal de soporte son accesibles.
- [ ] Data safety declara los datos técnicos de Analytics/Crashlytics condicionados al consentimiento.
- [ ] Se realiza primero una publicación de prueba interna o cerrada y se revisan los informes pre-lanzamiento.
- [ ] El despliegue de producción es gradual y tiene una persona responsable de vigilar crash rate y ANR.

## Retirada o reversión

Si aparece una incidencia crítica, detén el despliegue en Play Console, conserva la evidencia, publica un aviso en la release afectada y prepara un nuevo `versionCode` desde el último tag conocido como estable. Una APK/AAB ya distribuida no se sustituye en el mismo tag ni con el mismo código de versión.
