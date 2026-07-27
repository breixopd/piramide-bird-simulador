# Política de privacidad

**Pirámide de Bird Simulador** es una aplicación educativa de prevención de riesgos laborales mantenida por **Breixo Paz**, España. Esta política explica qué datos utiliza la aplicación, para qué se utilizan y qué puedes decidir.

En resumen:

- no necesitas crear una cuenta;
- tus simulaciones, estadísticas, progreso y logros permanecen en tu dispositivo;
- Firebase Analytics y Crashlytics están desactivados hasta que das permiso;
- puedes retirar ese permiso o borrar los datos locales cuando quieras.

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
- ubicación aproximada derivada por Google de una dirección IP enmascarada;
- información de diagnóstico, estado de la aplicación, trazas de fallos y metadatos técnicos asociados.

Firebase Crashlytics utiliza estos datos para agrupar y diagnosticar fallos y mostrar informes sobre estabilidad. Google describe con más detalle los datos tratados y sus plazos en su documentación sobre [privacidad y seguridad en Firebase](https://firebase.google.com/support/privacy).

La aplicación no envía a Firebase el historial de simulaciones, los textos de los escenarios, la estimación numérica introducida en el desafío, identificadores personalizados ni datos personales introducidos por la persona usuaria. Tampoco solicita el permiso `AD_ID` ni utiliza el identificador publicitario de Android. El tratamiento de los datos enviados a Firebase está sujeto también a las condiciones y medidas de privacidad de Google Firebase.

## Exportación y uso compartido

La persona usuaria puede generar una tarjeta de resultados y abrir el menú nativo para compartirla. La tarjeta contiene el modelo, la fecha, el número de iteraciones, los recuentos, la convergencia y un aviso educativo; no incluye relatos ni datos personales.

La exportación solo se realiza tras una acción voluntaria. Al elegir una aplicación de destino, el tratamiento posterior del archivo depende de esa aplicación o servicio. Pirámide de Bird Simulador no publica ni envía automáticamente el contenido.

## Finalidad y conservación

Los datos locales se utilizan para prestar las funciones solicitadas y mantener el progreso. Permanecen en el dispositivo hasta que se restablecen o se desinstala la aplicación.

Si se ha prestado consentimiento, la telemetría se utiliza para conocer el uso general, mejorar la experiencia y corregir fallos. Google Analytics puede conservar datos de usuario y eventos durante un máximo de **14 meses** en una propiedad estándar; el proyecto utilizará el plazo mínimo disponible de **2 meses** antes de la publicación general. Esta configuración no afecta a los informes estándar agregados, de acuerdo con la documentación de Google sobre [retención de datos de Analytics](https://support.google.com/analytics/answer/7667196?hl=es).

Crashlytics conserva durante **90 días** las trazas de fallos, los datos extraídos de minidumps y los identificadores asociados antes de iniciar su eliminación de los sistemas activos y de respaldo, conforme a la [política publicada de Firebase](https://firebase.google.com/support/privacy).

## Derechos y contacto

El responsable del proyecto y del tratamiento es **Breixo Paz**, España. La aplicación no gestiona cuentas ni una base de datos propia de personas usuarias.

Para consultas sobre privacidad o para ejercer tus derechos, utiliza el correo de contacto que aparece en la ficha de la aplicación en Google Play. Para errores generales que no contengan información personal puedes abrir una incidencia en [GitHub Issues](https://github.com/breixopd/piramide-bird-simulador/issues).

Para comunicaciones confidenciales, utiliza la función de [reporte privado de vulnerabilidades](https://github.com/breixopd/piramide-bird-simulador/security) disponible en la pestaña **Security** del repositorio. No publiques información sensible en GitHub Issues ni en otros canales públicos.

## Cambios en esta política

Los cambios relevantes se publicarán en este documento y, cuando sea necesario, se comunicarán en la aplicación antes de solicitar un nuevo consentimiento.

**Última actualización:** 27 de julio de 2026.
