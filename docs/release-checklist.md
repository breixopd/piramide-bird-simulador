# Lista de publicación

Esta lista cubre la APK local de prueba y el AAB para Google Play. La firma es deliberadamente manual: ninguna clave, contraseña ni configuración de Firebase debe almacenarse en Git ni en artefactos públicos.

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
- [ ] Aceptar activa solo los eventos documentados; la preferencia se aplica de inmediato y, tras reiniciar, se confirma el estado completo de los SDK.
- [ ] No se envían historial, relatos, estimaciones del desafío, identificadores personalizados ni datos introducidos por la persona usuaria.
- [ ] La retención de Analytics está configurada a 2 meses y se ha revisado la retención publicada de Crashlytics.
- [ ] La recogida del identificador publicitario y las señales de personalización permanece desactivada.

## APK local de prueba

1. Sincroniza los recursos con `npm run cap:sync`.
2. Genera la variante `debug` con `cd android && ./gradlew assembleDebug`.
3. Verifica el paquete, versión, firma y hash antes de instalarla:

   ```bash
   ALLOW_DEBUG_SIGNER="1" EXPECTED_VERSION_CODE="1000007" \
     scripts/prepare-pilot-release.sh android/app/build/outputs/apk/debug/app-debug.apk piramide-bird-1.0.0-device-test.apk
   ```

4. Instala la APK con `adb install --replace RUTA_APK` y ejecuta `docs/pilot-testing.md`, incluida la prueba sin conexión, segundo plano, reinicio, exportación y consentimiento.
5. Desinstala esta variante antes de instalar una compilación de Google Play: la APK de prueba usa la clave de depuración local y no representa la firma de producción.

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

Si aparece una incidencia crítica, detén el despliegue en Play Console, conserva la evidencia y prepara un nuevo `versionCode` desde el último commit conocido como estable. Un APK o AAB ya distribuido no se sustituye con el mismo código de versión.
