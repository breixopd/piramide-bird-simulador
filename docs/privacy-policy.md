# Política de privacidad

**Pirámide de Bird Simulador** es una aplicación educativa de prevención de riesgos laborales mantenida por [breixopd](https://github.com/breixopd) en el repositorio [breixopd/piramide-bird-simulador](https://github.com/breixopd/piramide-bird-simulador). Esta política explica qué datos utiliza la aplicación, con qué finalidad y qué control tiene la persona usuaria.

## Funcionamiento local

La simulación y el contenido educativo funcionan sin conexión. La aplicación guarda en el dispositivo:

- preferencias de tema, accesibilidad y experiencia;
- consentimiento o rechazo de la analítica;
- historial resumido de simulaciones;
- estadísticas acumuladas, progreso y logros.

Estos datos no requieren una cuenta y no se sincronizan con un servidor propio. Se pueden eliminar desde las opciones de restablecimiento de la aplicación o desinstalándola. El restablecimiento de estadísticas puede conservar ajustes, consentimiento y logros cuando así se indique en la confirmación mostrada por la aplicación.

## Firebase Analytics y Crashlytics

La recopilación mediante Firebase está **desactivada por defecto**. Solo se activa después de que la persona usuaria acepte expresamente el consentimiento mostrado en la aplicación. Puede retirarse en cualquier momento desde los ajustes: la preferencia se aplica inmediatamente, la aplicación deja de emitir eventos propios y reinicia los datos analíticos locales; el estado completo de los SDK queda confirmado al reiniciar la aplicación.

Con consentimiento, cada instalación puede enviar a Firebase Analytics eventos como:

- pantalla consultada;
- modelo educativo seleccionado;
- tamaño agregado de una simulación;
- apertura correcta de una acción de compartir.

Estos eventos se envían desde instalaciones individuales junto con datos técnicos; Firebase presenta los resultados en informes agregados. Según el servicio y cuando resulte aplicable, los datos transmitidos pueden incluir:

- un identificador de instancia de la aplicación para Analytics;
- identificadores de instalación de Firebase y de Crashlytics;
- modelo del dispositivo, versión del sistema operativo y versión de la aplicación;
- información de diagnóstico, estado de la aplicación, trazas de fallos y metadatos técnicos asociados.

Firebase Crashlytics utiliza estos datos para agrupar y diagnosticar fallos y mostrar informes sobre estabilidad. Google describe con más detalle los datos tratados y sus plazos en su documentación sobre [privacidad y seguridad en Firebase](https://firebase.google.com/support/privacy).

La aplicación no envía a Firebase el historial de simulaciones, los textos de los escenarios, la estimación numérica introducida en el desafío, identificadores personalizados ni datos personales introducidos por la persona usuaria. El tratamiento de los datos enviados a Firebase está sujeto también a las condiciones y medidas de privacidad de Google Firebase.

## Exportación y uso compartido

La persona usuaria puede generar una tarjeta de resultados y abrir el menú nativo para compartirla. La tarjeta contiene el modelo, la fecha, el número de iteraciones, los recuentos, la convergencia y un aviso educativo; no incluye relatos ni datos personales.

La exportación solo se realiza tras una acción voluntaria. Al elegir una aplicación de destino, el tratamiento posterior del archivo depende de esa aplicación o servicio. Pirámide de Bird Simulador no publica ni envía automáticamente el contenido.

## Finalidad y conservación

Los datos locales se utilizan para prestar las funciones solicitadas y mantener el progreso. Permanecen en el dispositivo hasta que se restablecen o se desinstala la aplicación.

Si se ha prestado consentimiento, la telemetría se utiliza para conocer el uso general, mejorar la experiencia y corregir fallos. La retención de los datos de usuario y de eventos de Analytics se configurará en **2 meses**. Esta configuración no afecta a los informes estándar agregados, de acuerdo con la documentación de Google sobre [retención de datos de Analytics](https://support.google.com/analytics/answer/7667196?hl=es).

Crashlytics conserva durante **90 días** las trazas de fallos, los datos extraídos de minidumps y los identificadores asociados antes de iniciar su eliminación de los sistemas activos y de respaldo, conforme a la [política publicada de Firebase](https://firebase.google.com/support/privacy).

## Derechos y contacto

El responsable del proyecto y del tratamiento se identifica públicamente como **breixopd**, España. La aplicación no gestiona cuentas ni una base de datos propia de personas usuarias. Los datos legales definitivos del responsable deberán confirmarse antes de la publicación general en Google Play.

Para consultas no sensibles sobre esta política, cuestiones generales de privacidad o ayuda para ejercer derechos relacionados con datos enviados por la aplicación, abre una incidencia en [GitHub Issues](https://github.com/breixopd/piramide-bird-simulador/issues). No incluyas información personal, sanitaria, laboral ni cualquier otro dato confidencial en una incidencia pública.

Para comunicaciones confidenciales, utiliza la función de [reporte privado de vulnerabilidades](https://github.com/breixopd/piramide-bird-simulador/security) disponible en la pestaña **Security** del repositorio. No publiques información sensible en GitHub Issues ni en otros canales públicos.

## Cambios en esta política

Los cambios relevantes se publicarán en este documento y, cuando sea necesario, se comunicarán en la aplicación antes de solicitar un nuevo consentimiento.

**Última actualización:** 27 de julio de 2026.
