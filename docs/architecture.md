# Arquitectura

Pirámide de Bird Simulador es una aplicación web local empaquetada para Android con Capacitor. La interfaz no depende de un servidor y las simulaciones se ejecutan íntegramente en el dispositivo.

## Límites de módulos

- `src/domain`: modelos de Bird, simulación ponderada, convergencia, desafío, gestos y logros. No depende del DOM ni de Capacitor.
- `src/data`: banco estático y validado de 80 escenarios preventivos en español.
- `src/platform`: adaptadores para Preferences, IndexedDB, Motion, Haptics, Filesystem, Share y Firebase.
- `src/components` y `src/views`: componentes Lit accesibles y las cuatro pantallas de la aplicación.
- `src/app-controller.ts`: coordina el dominio y la persistencia sin conocer detalles visuales.
- `src/main.ts`: composición de dependencias y arranque de la aplicación.

## Flujo de una simulación

1. La vista solicita un lote de 1, 100 o 1000 iteraciones.
2. El controlador elige el modelo activo y ejecuta el motor ponderado.
3. Se calculan los acumulados, la convergencia y los logros.
4. El resumen, los acumulados y el progreso se confirman juntos en una única transacción IndexedDB; un fallo revierte el conjunto completo.
5. La interfaz recibe el nuevo estado; el control de lanzamiento recorre símbolos y colores hasta
   detenerse en el resultado, y después actualiza pirámide, escenario, historial y gráfico.

El historial conserva como máximo las 500 ejecuciones más recientes, mientras el mismo registro transaccional mantiene los acumulados históricos. Los relatos consultados nunca salen del dispositivo.

## Modelos educativos

El modelo clásico representa `600:30:10:1` como cuasi accidentes, daños materiales, lesiones menores y lesión grave. La adaptación didáctica sustituye el daño material por niveles de lesión y añade una fatalidad; se identifica siempre como adaptación y exige aceptación antes de activarse.

## Privacidad y telemetría

Analytics y Crashlytics están desactivados en el manifiesto Android. El adaptador solo intenta habilitarlos después de un consentimiento explícito; una revocación deshabilita la recopilación, reinicia los datos de Analytics y elimina informes de fallos pendientes. Cualquier fallo del proveedor queda contenido para que Firebase nunca impida abrir o utilizar la aplicación.

El consentimiento se guarda antes que el resto de ajustes en un marcador independiente y las escrituras se serializan. Una revocación posterior siempre prevalece y un permiso interrumpido permanece denegado al reiniciar.

`google-services.json` y las claves de firma están excluidos de Git. Sin configuración Firebase, la aplicación conserva toda la funcionalidad local y la telemetría permanece inactiva.

## Entrega

Vite genera `dist`, Capacitor lo sincroniza con `android/app/src/main/assets/public` y Gradle produce el APK o AAB. Antes de entregar una compilación se ejecutan localmente el formato, lint, tipos, pruebas, auditoría de dependencias, compilación web, sincronización y verificaciones Android.
