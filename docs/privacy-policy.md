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

La recopilación mediante Firebase está **desactivada por defecto**. Solo se activa después de que la persona usuaria acepte expresamente el consentimiento mostrado en la aplicación. Puede retirarse en cualquier momento desde los ajustes; a partir de entonces se detiene la recopilación y se renueva el identificador local utilizado por la aplicación.

Con consentimiento, Firebase Analytics puede registrar eventos agregados como:

- pantalla consultada;
- finalización del tutorial inicial;
- modelo educativo seleccionado;
- tamaño agregado de una simulación;
- banda de resultado del desafío;
- desbloqueo de un logro;
- éxito o cancelación de una acción de compartir.

Firebase Crashlytics puede recopilar informes de fallos y datos técnicos necesarios para diagnosticarlos, como versión de la aplicación, modelo y versión del sistema operativo, estado de la aplicación y trazas del error.

La aplicación no envía a Firebase el historial de simulaciones, los textos de los escenarios, la estimación numérica introducida en el desafío, identificadores personalizados ni datos personales introducidos por la persona usuaria. El tratamiento de los datos enviados a Firebase está sujeto también a las condiciones y medidas de privacidad de Google Firebase.

## Exportación y uso compartido

La persona usuaria puede generar una tarjeta de resultados y abrir el menú nativo para compartirla. La tarjeta contiene el modelo, la fecha, el número de iteraciones, los recuentos, la convergencia y un aviso educativo; no incluye relatos ni datos personales.

La exportación solo se realiza tras una acción voluntaria. Al elegir una aplicación de destino, el tratamiento posterior del archivo depende de esa aplicación o servicio. Pirámide de Bird Simulador no publica ni envía automáticamente el contenido.

## Finalidad y conservación

Los datos locales se utilizan para prestar las funciones solicitadas y mantener el progreso. Permanecen en el dispositivo hasta que se restablecen o se desinstala la aplicación.

Si se ha prestado consentimiento, la telemetría agregada se utiliza para conocer el uso general, mejorar la experiencia y corregir fallos. Su conservación se rige por la configuración del proyecto Firebase y las políticas aplicables de Google.

## Derechos y contacto

La aplicación no gestiona cuentas ni una base de datos propia de personas usuarias. Para consultar esta política, comunicar una cuestión de privacidad o solicitar ayuda para ejercer derechos relacionados con datos enviados por la aplicación, abre una incidencia en [GitHub Issues](https://github.com/breixopd/piramide-bird-simulador/issues) dirigida a [breixopd](https://github.com/breixopd). Evita incluir información personal, sanitaria o laboral sensible en una incidencia pública.

Cuando una solicitud necesite información privada, indica en la incidencia pública únicamente que deseas establecer un canal privado; no publiques los datos afectados.

## Cambios en esta política

Los cambios relevantes se publicarán en este documento y, cuando sea necesario, se comunicarán en la aplicación antes de solicitar un nuevo consentimiento.

**Última actualización:** 10 de julio de 2026.
