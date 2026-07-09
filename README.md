# Pirámide de Bird Simulador

Aplicación móvil educativa, gratuita y en español para explorar de forma visual la relación estadística entre cuasi accidentes, daños y lesiones. Permite ejecutar simulaciones individuales o por lotes, observar la convergencia de los resultados, consultar escenarios preventivos y aprender mediante desafíos y logros.

La aplicación está pensada como apoyo para formación y sensibilización en prevención de riesgos laborales (PRL). No sustituye una evaluación de riesgos, una investigación de accidentes, una norma técnica ni el criterio de un profesional competente.

## Modelos educativos

- **Bird clásico:** 600 cuasi accidentes, 30 daños materiales, 10 lesiones menores y 1 lesión grave o incapacitante.
- **Adaptación didáctica:** 600 cuasi accidentes, 30 lesiones menores, 10 lesiones graves y 1 fatalidad.

La adaptación didáctica no es la formulación histórica de Bird. Se incluye para explicar eventos de baja frecuencia y alto impacto, y se identifica como tal dentro de la aplicación. Las simulaciones representan probabilidades teóricas; no predicen cuándo ocurrirá un accidente real ni permiten estimar el riesgo de una empresa o tarea concreta.

## Requisitos

- Node.js 22 o posterior.
- npm.
- Para Android: Android Studio y un SDK de Android compatible con Capacitor.

## Desarrollo local

Instala las dependencias:

```bash
npm install
```

Inicia el servidor de desarrollo:

```bash
npm run dev
```

Ejecuta las pruebas:

```bash
npm run test
```

Genera la compilación web de producción:

```bash
npm run build
```

Sincroniza la compilación web y los plugins con el proyecto Android:

```bash
npx cap sync android
```

Abre el proyecto nativo en Android Studio:

```bash
npx cap open android
```

Antes de sincronizar Android después de un cambio web, ejecuta de nuevo `npm run build`.

## Privacidad y funcionamiento sin conexión

El núcleo de la aplicación funciona sin conexión. El historial, los ajustes, el progreso y los logros se guardan localmente en el dispositivo.

Firebase Analytics y Firebase Crashlytics permanecen desactivados hasta que la persona usuaria presta un consentimiento explícito. Si acepta, solo se recopilan métricas agregadas de uso y diagnósticos técnicos; no se envían relatos consultados, historial de simulaciones, estimaciones del desafío ni datos introducidos por la persona usuaria. El consentimiento puede retirarse desde los ajustes.

La exportación y el uso del menú nativo para compartir solo se ejecutan por iniciativa de la persona usuaria. Consulta la [política de privacidad](docs/privacy-policy.md) para conocer todos los detalles.

## Piloto y publicación

El proceso de entrega previsto es:

1. Comprobar tipos, pruebas y compilación web.
2. Generar una APK `release` firmada fuera de la automatización pública.
3. Publicar la APK como _prerelease_ de GitHub junto con su suma SHA-256.
4. Validar el piloto con profesionales de PRL y personas en formación siguiendo la [guía de pruebas](docs/pilot-testing.md).
5. Corregir incidencias críticas o de contenido antes de generar el AAB final.
6. Publicar manualmente en Google Play con la misma clave de firma, la política de privacidad y la declaración de seguridad de datos.

Los fallos funcionales se pueden comunicar mediante la plantilla **Informe de error** de GitHub Issues. Las dudas o correcciones preventivas deben usar **Revisión de contenido PRL**.

## Alcance inicial

La primera versión está orientada a Android y a español de España. Es gratuita, no incluye publicidad, cuentas, compras, sonidos ni notificaciones. iOS y otros modelos históricos quedan fuera de esta primera entrega.

## Contacto

Proyecto mantenido por [breixopd](https://github.com/breixopd) en [breixopd/piramide-bird-simulador](https://github.com/breixopd/piramide-bird-simulador). Para soporte, privacidad o sugerencias, abre una incidencia en [GitHub Issues](https://github.com/breixopd/piramide-bird-simulador/issues).
