# Guía de prueba local para Android

Esta guía sirve para probar en un dispositivo una compilación de Pirámide de Bird Simulador antes de distribuirla mediante Google Play. La APK local usa una firma de depuración y no debe publicarse ni subirse a Play Console.

## Instalar de forma segura

1. Utiliza únicamente la APK generada localmente o enviada directamente por el mantenedor para esta prueba.
2. Conserva junto a ella el archivo `.sha256` entregado y verifica la suma siguiendo el apartado siguiente.
3. En Android, permite temporalmente a tu navegador o gestor de archivos **Instalar aplicaciones desconocidas**.
4. Abre la APK verificada y revisa el nombre y la versión de la aplicación antes de confirmar.
5. Después de instalarla, desactiva de nuevo el permiso **Instalar aplicaciones desconocidas**.

Android mostrará una advertencia porque esta APK se instala fuera de Google Play. No desactives Play Protect. Si el nombre, la versión, el tamaño o la suma no coinciden con los datos entregados, cancela la instalación y comunica la incidencia.

## Verificar la suma SHA-256

Compara el resultado completo del comando con el contenido del archivo `.sha256` entregado. Deben coincidir todos los caracteres.

### Linux

```bash
sha256sum piramide-bird.apk
```

### macOS

```bash
shasum -a 256 piramide-bird.apk
```

### Windows PowerShell

```powershell
Get-FileHash .\piramide-bird.apk -Algorithm SHA256
```

Si la suma no coincide, elimina el archivo y no lo instales.

## Preparación de la prueba

- Utiliza un dispositivo Android 7 o posterior que no contenga información crítica si es posible.
- Anota modelo del dispositivo, versión de Android y versión de la app.
- Prueba primero sin conexión y luego, si deseas evaluar la telemetría, con conexión.
- No introduzcas datos personales, sanitarios ni identificadores reales de empresas o accidentes.
- Para incidencias reproducibles, anota pasos, resultado esperado, resultado observado y frecuencia.

## Lista para profesionales de PRL

- [ ] El modelo Bird clásico se presenta con las categorías y proporciones correctas.
- [ ] La adaptación con fatalidad está claramente identificada como didáctica y no histórica.
- [ ] Los avisos dejan claro que la app no predice accidentes ni sustituye una evaluación de riesgos.
- [ ] Las narrativas son verosímiles, respetuosas y no trivializan lesiones o fatalidades.
- [ ] Peligros, causas inmediatas, consecuencias y medidas preventivas son coherentes entre sí.
- [ ] Las medidas preventivas siguen una jerarquía adecuada y no dependen únicamente de EPI o conducta individual.
- [ ] El lenguaje es comprensible, preciso y adecuado para formación en España.
- [ ] El desafío y los logros refuerzan la reflexión preventiva sin premiar la ocurrencia de daño.

Comunica cualquier corrección mediante la plantilla **Revisión de contenido PRL**.

## Lista para personas en formación

- [ ] La pantalla inicial permite comprender el objetivo sin ayuda externa.
- [ ] Se distingue el modelo clásico de la adaptación didáctica.
- [ ] Es fácil ejecutar una simulación y los lotes de 100 y 1.000.
- [ ] El recorrido de símbolos y colores del botón **Lanzar** se entiende sin memorizar
      instrucciones y se detiene claramente en el resultado.
- [ ] La pirámide, las tarjetas y las estadísticas son legibles en el móvil.
- [ ] El gráfico de convergencia y su explicación resultan comprensibles.
- [ ] Los escenarios ayudan a relacionar un evento con causas y prevención.
- [ ] El modo desafío explica el resultado incluso cuando la respuesta es incorrecta.
- [ ] Tema oscuro, tamaño táctil, reducción de movimiento y lector de pantalla funcionan como se espera.
- [ ] El consentimiento de analítica se entiende y se puede retirar fácilmente.
- [ ] La exportación muestra solo datos agregados y abre el menú de compartir correcto.
- [ ] La aplicación sigue funcionando al activar el modo avión y tras volver del segundo plano.

Comunica fallos mediante la plantilla **Informe de error**.

## Información útil para una incidencia

Incluye la versión de la aplicación, dispositivo, versión de Android, pasos exactos y capturas sin datos personales. No publiques información privada o sensible. Si el problema impide abrir la app, indícalo en el título.

Antes de finalizar, comprueba que puedes desinstalar la APK con normalidad. La desinstalación elimina los datos locales de la aplicación.
