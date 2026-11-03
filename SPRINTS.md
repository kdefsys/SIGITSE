# SPRINTS — Plan de desarrollo del MVP de SIGITSE

**Calendario operativo vigente:** [Plan de entrega 2026](docs/planning/PLAN_ENTREGA_2026.md): siete sprints desde 15/09 hasta 15/12, responsables por historia y alcance posterior explícito. Las secciones 0–4 siguientes conservan las rebanadas del alcance completo del producto y su trazabilidad; no son las ventanas del calendario reestructurado.

**Plan de desarrollo por rebanadas verticales (*vertical slicing*)** del Sistema de Gestión Digital del Procedimiento de Inspección Técnica de Seguridad en Edificaciones para riesgo bajo y medio.

## Estado del avance comprobado

Equipo: cuatro integrantes. Secuencia prevista: sprints 0 a 4, sin fechas ni duraciones fijadas. La evaluación es por evidencia de código, no por tiempo transcurrido ni por número de pantallas. **No hay un sprint completo acreditado. Hay implementación parcial hasta el Sprint 2**, con brechas anteriores. Sprints 3 y 4 pendientes de implementar. No se asigna porcentaje de avance sin ponderación acordada.

| Sprint | Estado | Implementado en código | Falta para aceptar el flujo |
|---|---|---|---|
| 0 | Parcial | Registro por API/web, bcrypt, login JWT, tres roles, logout local, panel y cambio de roles | Creación/edición de cuentas internas, desactivación, funcionario separado, historial, privacidad y entorno reproducible |
| 1 | Parcial | Solicitud básica, archivo opcional, recibo/importe, detalle, historial, descargas privadas y calendario inicial | Borrador editable, declaración, tasas, presentación inmutable, cargo, inicio de plazos al presentar, anulación e idempotencia |
| 2 | Parcial | Asignación a usuario INSPECTOR e historial de revisiones con motivo | Requerimiento único, subsanación, riesgo, programación, historial y conclusión documental |
| 3 | Pendiente | Sin entidades ni servicios del flujo | PWA, visitas, checklist, fotografías vinculadas, persistencia offline, sincronización y actas |
| 4 | Pendiente | El listado básico previo no completa este sprint | Conflictos, levantamiento, verificación, informe, conclusión, certificado, historial/descargas y restauración |

**Evidencia:** AuthService/AuthModule y AuthContext para Sprint 0; ItseController/ItseService, CreateRequestModal y PaymentModal para Sprint 1; ItseService.assignInspector/reviewRequest, AssignInspectorModal y ReviewModal para Sprint 2. El esquema Prisma solo define User, ItseRequest, Document, Payment, ItseRequestHistory y BusinessHoliday.

**Pendiente de confirmar:** aceptación formal de sprints, ejecución previa del flujo con base de datos, despliegue, versión de PostgreSQL, creación externa de inspectores/administradores, sustitución permanente de la separación de roles, política de inactividad y longitud mínima objetivo de contraseña. No se interpreta la ausencia de código como cancelación del alcance.

Los criterios y flujos siguientes son compromisos pendientes de aceptación, excepto lo identificado expresamente como implementación actual. Las pruebas mínimas listadas son pruebas requeridas, no resultados ejecutados. No hay evidencia de idempotencia, auditoría o máquina de estados; restricciones únicas y valores enum no los sustituyen.

## 1. Estrategia de desarrollo

### 1.1 Principio de vertical slicing

Cada sprint entrega un flujo ejecutable de extremo a extremo: interfaz, API, reglas de dominio, persistencia, historial y pruebas. No se consideran sprints completos de base de datos, API o frontend por separado.

Dentro de cada rebanada se recomienda este orden de trabajo, sin convertirlo en división por capas:

1. Definir DTO y validaciones en los módulos del backend y tipos de consumo en el frontend. Actualmente no existe paquete compartido de contratos.
2. Implementar la operación de dominio, la ruta API, la persistencia transaccional y sus pruebas.
3. Conectar la interfaz real a la API y mostrar estados, errores y confirmaciones.
4. Incorporar el caso de uso a la prueba E2E acumulativa.

### 1.2 Reglas comunes

- La API es la autoridad: valida permisos, pertenencia, reglas de negocio y transiciones aunque el cliente también valide.
- Objetivo pendiente: centralizar transiciones y confirmar el historial junto con el cambio. Actualmente ItseService escribe status directamente; no existen transicionar() ni historial_actuaciones.
- Las operaciones críticas son idempotentes mediante `Idempotency-Key` o `opId`; los reintentos no duplican efectos.
- La solicitud presentada, las versiones documentales, las actuaciones y los documentos de cierre no se sobrescriben silenciosamente.
- No se aplica «última escritura gana» a conflictos de sincronización. Resolver o descartar una operación no equivale a aplicarla; el manifiesto vigente debe reflejar los datos efectivamente incorporados.
- Los plazos usan actos iniciales y recepción del servidor, calendario `America/Lima`, feriados y días no laborables. Pausar o reanudar requiere actuación motivada del funcionario; reprogramar no reinicia el cómputo. Los vencimientos solo generan alertas y visualización.
- El flujo E2E es acumulativo: cada sprint mantiene funcionales los tramos anteriores.
- Si falta capacidad, se priorizan los requisitos **Must**. Las funciones **Should/Could** no deben bloquear el flujo obligatorio.
- El MVP no incluye correos automáticos, verificación de correo ni recuperación de contraseña; el seguimiento se realiza dentro del portal y mediante el historial.

### 1.3 Mapa de sprints

| Sprint | Rebanada demostrable | RF principales | Resultado al terminar |
|---|---|---|---|
| **0** | Acceso por rol y administración de cuentas internas | RF-001, RF-002, RF-028 | Usuarios pueden iniciar/cerrar sesión; el administrador gestiona cuentas internas y roles. Base desplegable lista para los flujos siguientes. |
| **1** | Crear, pagar y presentar solicitud; consultar estado inicial | RF-004 a RF-007, RF-026 parcial | Administrado presenta solicitud válida, obtiene cargo PDF y ve su expediente. |
| **2** | Revisar documentos, subsanar, clasificar y programar o concluir documentalmente | RF-008 a RF-012, RF-023 parcial | Funcionario emite un requerimiento único, revisa la subsanación, clasifica y programa; si corresponde, registra cierre documental desfavorable y genera su documento de conclusión. |
| **3** | Ejecutar diligencia con PWA offline-first | RF-013 a RF-019 | Inspector trabaja sin conexión, registra checklist, fotos, actas, suspensión u observaciones y sincroniza con control de conflictos. |
| **4** | Resolver conflictos, verificar levantamiento, cerrar y consultar expediente completo | RF-017 (resolución), RF-020 a RF-026 | Se completa el ciclo hasta conclusión; se genera certificado solo en el cierre favorable ordinario. RF-026 queda completo. Verificador público es opcional. |

### 1.4 Base técnica de ejecución

Base actual: dos proyectos npm, React/TypeScript/Vite en sigitse-fronted y NestJS/TypeScript con Express en sigitse-backend; Prisma y PostgreSQL para persistencia, Multer para archivos locales. Validación con DTO y class-validator; no se usan Fastify, Zod, Drizzle ni packages/shared. La PWA, Docker Compose, Caddy y datos semilla no aparecen implementados. Hay migración inicial y migración incremental de revisiones versionadas. La versión real de PostgreSQL y el despliegue externo están pendientes de confirmar.

La PWA se valida en un dispositivo real con **Android 10 o superior y Google Chrome con cámara**. El portal se prueba en las dos versiones estables más recientes de Chrome y Firefox (RNF-011).

---

## 2. Plan detallado por sprint

## Sprint 0 — Acceso, roles y administración de cuentas

**Estado actual: parcial; no aceptado como completo mediante evidencia del repositorio.**

**Objetivo:** entregar un entorno desplegable en el que cada actor pueda autenticarse y operar solo con los permisos de su rol.

**Alcance:** RF-001 (registro básico; sin verificación por correo), RF-002 y RF-028. Configuración inicial de los dos proyectos npm, sesión, almacenamiento de contraseñas, RBAC, historial y usuarios de demostración.

**Flujo objetivo de aceptación (no implica implementación completa):**
1. Un administrado crea una cuenta con correo único.
2. Cada rol de demostración inicia sesión y llega a su panel correspondiente.
3. El administrador crea, edita y desactiva una cuenta interna, y asigna un rol.
4. Una cuenta desactivada no puede iniciar sesión y las actuaciones anteriores permanecen en el historial.
5. Una petición sin sesión o con rol no autorizado es rechazada por la API.

**Criterios de aceptación:**
- Correo duplicado devuelve `409`; credenciales inválidas `401`; cuenta desactivada `403`.
- Contraseñas almacenadas con hash adaptativo y sal; mínimo actual de 6 caracteres con bcrypt de coste 10; endurecimiento a 12 pendiente de confirmar (RNF-003).
- Cada endpoint protegido valida rol y alcance del recurso (RNF-004); ADMIN actualmente dispone de permisos de revisión y pago; la separación futura de funciones está pendiente de confirmar.
- Las acciones administrativas dejan historial con actor, acción, objeto, fecha del servidor y motivo cuando corresponde (RNF-007).
- RNF-005: JWT actual con vigencia fija de un día y logout local. La política de 30 minutos de inactividad y la conservación de borradores están pendientes de confirmar/implementar.
- El registro muestra el aviso de privacidad y conserva constancia de lectura; se comprueba junto con las validaciones de cuenta (objetivo pendiente).
- El entorno actual usa los scripts npm de cada proyecto y requiere DATABASE_URL y JWT_SECRET. Arranque reproducible desde clon limpio, datos semilla y contenedores: pendientes de verificar/implementar.

**Pruebas mínimas:** login/logout, correo duplicado, cuenta desactivada, matriz de permisos por rol, historial administrativo y migración sobre base de datos vacía; expiración JWT de un día; ventana de inactividad de 30 minutos pendiente de confirmar, reautenticación y aviso/constancia de privacidad; compatibilidad del portal en las dos versiones estables más recientes de Chrome y Firefox.

**Fuera de este sprint/MVP:** verificación de correo, recuperación de contraseña y correos automáticos (RF-001 Should, RF-003 y RF-027 Should).

---

## Sprint 1 — Solicitud, pago simulado y presentación

**Estado actual: parcial; no aceptado como completo mediante evidencia del repositorio.**

**Objetivo:** permitir que el administrado presente una solicitud completa e inmutable y consulte el estado inicial de su expediente.

**Alcance:** RF-004, RF-005, RF-006, RF-007 y parte de RF-026.

**Flujo objetivo de aceptación (no implica implementación completa):**
1. El administrado crea y edita un borrador con los campos exigidos.
2. Descarga el formato de declaración jurada y adjunta el PDF suscrito.
3. Registra el pago simulado con importe correspondiente al procedimiento y aviso visible de que no existe cobro real.
4. Presenta la solicitud; el sistema asigna número de expediente, congela la versión presentada, genera el cargo PDF y registra el inicio y vencimiento de los nueve días hábiles del procedimiento.
5. Consulta sus expedientes, el estado del recién presentado y el vencimiento del plazo general.

**Criterios de aceptación:**
- No se permite presentar sin pago en estado `Registrado`, datos válidos y declaración jurada PDF válida.
- Se valida tipo real de archivo y tamaño máximo de 10 MB; el archivo debe poder abrirse. Esto no acredita la autenticidad de firma ni la veracidad del contenido.
- El importe aplicado queda congelado al presentar. Solo el administrado propietario registra/anula en Borrador, con motivo, idempotencia e historial; un expediente o pago ajeno devuelve `404`, otro rol `403` y un estado incompatible `409`.
- Solo existe un pago Registrado vigente por expediente. Tras anular se conserva el pago y el siguiente se inserta, sin reactivar el anterior. Cambiar el procedimiento exige anular primero el pago registrado; después de presentar no se registra ni se anula.
- La presentación confirmada inicia una sola vez el plazo general de nueve días hábiles para ambos procedimientos. Se cuenta desde el día hábil siguiente y vence al terminar el último día en `America/Lima`; calendario y exclusiones se cargan por semilla en este sprint. El portal muestra vencimiento y alerta, sin concluir ni emitir documentos automáticamente por vencer.
- Tras presentar, la solicitud no puede modificarse desde la interfaz ordinaria; una corrección posterior conserva versiones y utiliza el flujo previsto.
- El cargo PDF lleva encabezado y marca de agua «DEMOSTRACIÓN ACADÉMICA — SIN VALIDEZ ADMINISTRATIVA» en todas sus páginas (RNF-015).
- Un administrado solo puede consultar sus propios expedientes; la descarga de archivos requiere sesión y autorización.
- RNF-013 está incluido por acuerdo: al incorporar datos y archivos se configuran copias diarias de ambos en destino separado; su restauración y pérdida máxima de 24 h se demostrarán en Sprint 4.

**Pruebas mínimas:** validaciones de borrador, pago no registrado, PDF inválido o excesivo, presentación duplicada, inmutabilidad del snapshot, generación idempotente del cargo y acceso a expediente ajeno (`404`); nueve días hábiles en ambos procedimientos, exclusión de fines de semana/feriados/días no laborables, límite de fin de día, reintento sin reiniciar plazo y vencimiento sin cierre automático; anulación permitida solo al propietario en Borrador, motivo obligatorio, pago/expediente ajeno y rol denegados, pago vigente duplicado, cambio de procedimiento con pago registrado, reintento idempotente, nuevo pago tras anular y rechazo tras presentar.

**Límite de alcance de RF-026:** en este sprint se implementa la consulta inicial del expediente y su estado. La vista completa de historial y documentos queda para el Sprint 4.

---

## Sprint 2 — Revisión documental, subsanación, clasificación y programación

**Estado actual: parcial; no aceptado como completo mediante evidencia del repositorio.**

**Objetivo:** llevar una solicitud presentada a programación de inspección o a un cierre documental desfavorable motivado con su documento de conclusión.

**Alcance:** RF-008 a RF-012 y parte de RF-023: decisión motivada y documento de conclusión de los cierres documentales desfavorables. Incluye los estados de revisión, subsanación documental, clasificación, asignación y programación. Informe técnico, certificado y cierres técnicos ordinarios y excepcionales permanecen en el Sprint 4.

**Flujo objetivo de aceptación (no implica implementación completa):**
1. El funcionario abre un expediente presentado e inicia la revisión documental.
2. Registra observaciones individualizadas (campo/documento, defecto y corrección solicitada) y las comunica agrupadas en un único requerimiento por expediente.
3. El administrado presenta una subsanación en el mismo expediente; se conservan las versiones anteriores y nuevas.
4. El funcionario revisa la respuesta y acepta o mantiene cada observación original con motivación. Si queda alguna pendiente, registra conclusión desfavorable motivada y genera su documento; no emite otra ronda de observaciones ni renueva el plazo.
5. Con la revisión conforme, registra la clasificación manual asistida y el reporte de riesgo.
6. Para riesgo bajo o medio, asigna inspector activo y programa la visita.
7. Si la clasificación resulta alto o muy alto, el sistema bloquea la programación; el funcionario registra el cierre documental desfavorable motivado y el sistema genera su documento de conclusión con los soportes de clasificación, sin acta de inspección ni informe técnico.

**Transiciones clave:**

`Presentado → En revisión documental → Pendiente de subsanación documental → Subsanación presentada → En revisión documental → Habilitado para programación → Inspección programada`

Rutas de cierre documental: `En revisión documental → Concluido desfavorable` por clasificación alto/muy alto o por observaciones pendientes tras revisar la respuesta; `Pendiente de subsanación documental → Concluido desfavorable` por decisión motivada tras vencer el plazo sin respuesta. En todas se registra la decisión y se genera el documento de conclusión con sus soportes.

La subsanación documental no debe confundirse con el levantamiento de observaciones físicas del Sprint 3/4. Se utiliza el nombre oficial `Pendiente de subsanación documental` en los contratos y transiciones.

**Criterios de aceptación:**
- Las observaciones identifican defecto y corrección solicitada y se agrupan en un requerimiento único. La API rechaza un segundo requerimiento con `409`; revisar la respuesta no reinicia el plazo.
- El funcionario registra aceptación o mantenimiento motivado de cada observación original. Si quedan pendientes tras la respuesta, registra cierre documental desfavorable; no habilita la programación.
- El plazo documental es de dos días hábiles desde la publicación del requerimiento y su disponibilidad en el portal, contando desde el día hábil siguiente hasta terminar el último. El sistema registra vencimiento y alerta, pero **no cierra automáticamente** el expediente: el funcionario registra la decisión motivada correspondiente.
- Si corresponde suspender/reanudar un cómputo, el funcionario identifica plazo, fundamento y soporte; se conservan consumido, saldo y vencimientos en historial. Observar documentos o reprogramar no pausa ni reinicia automáticamente los nueve días.
- Las respuestas tardías se conservan y marcan; no se ocultan ni se eliminan.
- La conclusión documental referencia la clasificación y su reporte, o el requerimiento, sus observaciones y las respuestas y versiones si existen, con el vencimiento cuando corresponda. No exige acta de inspección ni informe técnico y no genera certificado.
- La decisión, el cambio de estado, el historial y el registro del documento de conclusión se confirman en la misma operación transaccional e idempotente. Su PDF lleva encabezado y marca de agua académicos en todas las páginas (RNF-015).
- Sin clasificación registrada no se puede programar; riesgo bajo/medio permite continuar; alto/muy alto bloquea el flujo ordinario.
- Si la clasificación determina el otro nivel bajo/medio, se conserva el procedimiento solicitado y el importe presentado; el riesgo clasificado queda separado y la discrepancia se muestra y audita, sin cobro adicional, devolución ni bloqueo. Los documentos distinguen procedimiento solicitado y riesgo clasificado.
- La asignación y sus cambios conservan un registro histórico identificado por UUID, además del historial; el inspector debe estar activo. Ese registro se utilizará en Sprint 3 para recibir evidencia antigua en cuarentena.
- Un solapamiento del mismo inspector devuelve `409`.
- Se reutiliza el calendario semilla del Sprint 1 y se verifican los parámetros de tasas. Su gestión desde interfaz es RF-029 **Should**, no requisito para completar el MVP.

**Pruebas mínimas:** requerimiento único y rechazo de una segunda ronda; subsanación aceptada; respuesta revisada con observaciones pendientes y cierre documental motivado; respuesta tardía; vencimiento sin respuesta y sin cierre automático; falta de clasificación; cierre documental por riesgo alto/muy alto; soportes de conclusión obligatorios sin exigir acta ni informe; generación transaccional e idempotente de conclusión sin certificado; PDF académico; inspector desactivado, solapamiento y acceso según rol; publicación única como inicio documental, recepción antes/después del límite y pausa/reanudación motivada con saldo conservado; discrepancia bajo→medio y medio→bajo con procedimiento/importe intactos, riesgo visible y auditable, sin ajustes de cobro y sin confundirla con el cierre alto/muy alto.

---

## Sprint 3 — Inspección y trabajo offline-first

**Estado actual: pendiente de implementar; no aceptado como completo mediante evidencia del repositorio.**

**Objetivo:** permitir al inspector ejecutar la diligencia desde la PWA, incluso sin conectividad, y sincronizarla sin pérdida ni duplicación de datos.

**Alcance:** RF-013 a RF-019 y continuación del flujo de RF-012 para diligencias suspendidas. Se crea la inspección lógica única por expediente y se enlazan sus visitas y continuaciones. El cierre administrativo, las versiones técnicas publicadas y la generación final de informes se completan en el Sprint 4.

**Flujo objetivo de aceptación (no implica implementación completa):**
1. El inspector asignado descarga el paquete de visita, declaración y checklist.
2. Inicia la visita y realiza las comprobaciones previas de clasificación e implementación del establecimiento.
3. Resuelve explícitamente los 67 ítems en el conjunto consolidado: `Sí cumple`, `No cumple` o `No aplica` justificado, sin omisiones por filtros. Selecciona y justifica la ruta K20/K21 frente al formulario versionado; describe incumplimientos y adjunta fotos o imposibilidad justificada.
4. Se queda sin conexión, cierra y reabre la PWA y verifica que respuestas y fotos persisten con confirmación local.
5. Regresa la conectividad y sincroniza operaciones y fotografías; los reintentos no duplican registros.
6. Según lo observado, finaliza la diligencia ordinaria, registra suspensión con causa y acta, o registra observaciones subsanables K52–K67 con los días concedidos en acta, hasta tres hábiles.
7. Si no corresponde continuar por riesgo fuera de alcance o falta de implementación, registra el acta y el sustento para la decisión de cierre motivado del Sprint 4; no completa artificialmente el checklist.

**Criterios de aceptación:**
- Solo se trabaja offline con visitas descargadas previamente; cerrar o reabrir la aplicación no elimina borradores (RNF-008).
- Cada respuesta/foto queda en almacenamiento local y en la cola de salida antes de confirmar el guardado.
- La sincronización usa identificadores idempotentes; repetir cinco veces la misma operación no duplica inspecciones ni evidencias (RNF-009).
- El servidor guarda por separado la hora local de captura y la hora de recepción; la hora local no determina vencimientos.
- El servidor acepta `visita.finalizar` solo con asignación vigente y un manifiesto identificado/versionado coherente con operaciones, fotos y revisiones vigentes, sin conflictos abiertos ni correcciones de sincronización pendientes. Se conservan todos los intentos; resolver o corregir exige un nuevo manifiesto y `opId`, sin incluir descartes como aplicaciones.
- Las ediciones divergentes y las visitas canceladas o reasignadas generan conflicto visible; se conservan ambas versiones. Una asignación histórica propia solo permite entregar operaciones y fotos en cuarentena, sin listar, descargar ni leer el trabajo vigente; sin asignación actual ni histórica → `404`. No se genera informe mientras existan conflictos abiertos o correcciones de sincronización pendientes.
- Se conservan el hash de los bytes de entrada y el del archivo fotográfico recodificado; reintentar la misma entrada no duplica evidencia y un contenido diferente con el mismo `fotoId` se rechaza.
- La suspensión conserva causa, descripción, acta y, cuando proceda, nueva fecha. Las reglas de reprogramación dependen de la causa y no permiten reinicios indefinidos. El funcionario registra por separado la afectación al plazo, su suspensión/reanudación motivada y el saldo; ni la fecha local offline ni reprogramar alteran el vencimiento automáticamente.
- Las observaciones subsanables son solo del bloque K52–K67. El acta conserva los días concedidos, hasta tres hábiles; el cómputo inicia cuando el acta está recibida en el servidor y disponible para el administrado en el portal. Se cuenta desde el día hábil siguiente y vence al terminar el último día; la captura offline sola no inicia el plazo.
- La finalización y sincronización de la visita **no equivalen** a la conclusión administrativa del expediente ni exigen un informe previo. El expediente permanece `En evaluación técnica` hasta emitir el informe en Sprint 4.
- La continuación es una nueva visita de la misma inspección, vinculada a la visita suspendida y su acta; conserva el checklist, las observaciones y sus autores, y registra lo pendiente sin duplicar el conjunto técnico. La anterior no se sobrescribe ni se reactiva.
- La emisión ordinaria exigirá todos los ítems resueltos; una continuación o cierre anticipado no fuerza respuestas ficticias. La evidencia fotográfica ausente requiere motivo, inspector y fecha visibles en el informe/panel, sin cambiar el resultado técnico.
- La depuración local conserva siete días desde cierre operativo y sincronización completa, también para visitas suspendidas resueltas por continuación/verificación documental. Se comprueba al iniciar, reanudar y durante uso; una PWA cerrada limpia al siguiente inicio. Nunca se borran borradores, operaciones/fotos pendientes ni datos compartidos que aún necesiten.
- Las actas PDF de este sprint llevan encabezado y marca de agua académicos en todas las páginas (RNF-015).
- La inspección lógica y el vínculo de la visita inicialmente programada se crean al iniciar su ejecución en este sprint. El inspector inicial es el responsable técnico. Su sustitución requiere actuación expresa del funcionario con motivo e historial, coherente con el inspector de la visita operativa.

**Pruebas mínimas:** persistencia tras reinicio offline, foto pendiente, sincronización repetida, manifiesto incompleto, conflicto por edición divergente, visita reasignada/cancelada, validaciones del checklist, suspensión y observaciones subsanables; cuarentena con asignación histórica propia y `404` sin ella, sin acceso a datos vigentes; idempotencia tras recodificar fotografías; acta offline sin inicio de plazo hasta recepción/disponibilidad; reintento sin reinicio y pausa/reanudación con saldo conservado; varias visitas de una sola inspección, continuación enlazada sin duplicar respuestas, asignación técnica coherente y visita finalizada sin informe previo; los 67 ítems sin omisiones, No aplica justificado, alternativa K20/K21 expresa, imposibilidad fotográfica trazable, actas PDF académicas, depuración de visita resuelta/sincronizada tras siete días y conservación de trabajo local pendiente.

**Compatibilidad manual:** dispositivo real con Android 10 o superior, Google Chrome y cámara. iOS y otros navegadores móviles están fuera del MVP.

---

## Sprint 4 — Conflictos, levantamiento, cierre y consulta completa

**Estado actual: pendiente de implementar; no aceptado como completo mediante evidencia del repositorio.**

**Objetivo:** completar el procedimiento desde la resolución de conflictos o el levantamiento hasta la conclusión, con documentos coherentes con el resultado técnico.

**Alcance:** resolución de conflictos de RF-017; RF-020, RF-021, RF-022 y RF-024, incluida verificación documental/presencial y corrección técnica con nuevas versiones; completar RF-012 para programar verificaciones, RF-023 con los cierres técnicos ordinarios y excepcionales, y RF-026 con la consulta completa. El tramo documental de RF-023 se entrega en el Sprint 2 y se mantiene en las pruebas acumulativas. RF-025 (verificador público) es **Should** y puede posponerse sin bloquear el MVP.

**Flujo ordinario demostrable:**
1. El funcionario revisa y resuelve los conflictos conservando versiones y motivo. El servidor revalida visita, asignación y revisión examinada; una aceptación exige asignación de origen vigente. El inspector vigente presenta un nuevo manifiesto coherente tras resolver; un descarte nunca cuenta como aplicación.
2. El administrado presenta el levantamiento en plazo con escrito, evidencias y sustento técnico cuando corresponda. Una recepción tardía se conserva, pero no inicia verificación.
3. El responsable técnico vigente elige medio y pasa a `En verificación`. Si es documental, resuelve sin visita ficticia; si es presencial, el funcionario programa la visita vinculada y sus continuaciones cuando correspondan. Registra `Cumple Sí/No` y evidencia por cada observación original.
4. Con evaluación completa —visitas requeridas finalizadas/sincronizadas o verificación documental completa—, el responsable vigente genera el informe y panel desde una versión técnica consolidada e inmutable. La emisión y el paso a `Pendiente de cierre` se confirman conjuntamente.
5. El funcionario revisa el informe vigente. Si detecta un error, solicita corrección motivada sin salir de `Pendiente de cierre`; el responsable técnico atiende con nuevas versiones de datos e informe. Solo sin solicitudes pendientes registra una conclusión motivada coherente con el resultado técnico.
6. Si la conclusión ordinaria es favorable, el sistema genera el certificado demostrativo con código único. Si es desfavorable, no genera certificado.
7. El administrado consulta su expediente, historial y documentos propios, y descarga documentos con autenticación.

**Rutas de cierre excepcional obligatorias:**

- **Cierres documentales del Sprint 2 (regresión):** clasificación alto/muy alto, observaciones pendientes tras revisar la respuesta o decisión motivada de concluir tras vencer el plazo sin subsanación; documento de conclusión con soportes documentales, sin acta de inspección, informe técnico ni certificado.
- **Cierre anticipado desde la inspección:** acta válida y decisión motivada por riesgo fuera del alcance, falta de implementación u otra causa aplicable; no se inventa un informe ni se completa artificialmente el checklist.
- **Suspensión:** el funcionario puede cerrar motivadamente sin nueva diligencia cuando la causa y el resultado lo justifiquen; el acta se conserva.
- **Vencimiento del plazo de levantamiento:** el sistema alerta y muestra el vencimiento. Si no se presenta el levantamiento o la verificación ya no procede, el funcionario registra la decisión motivada; el vencimiento no genera cierre ni resultado técnico automáticamente.
- **Respuesta tardía al levantamiento:** antes del cierre se registra como tardía con fecha del servidor y sin transición a `Levantamiento presentado`; permanece `Pendiente de levantamiento`, no habilita verificación ni concede otra oportunidad. El funcionario registra la decisión motivada las reglas del procedimiento. No se inventa resultado técnico ni se cierra automáticamente; tras concluir solo se permite consulta y descarga.

**Secuencia documental y reglas de aceptación:**
- Flujo ordinario: `INFORME` técnico → `CONCLUSION` → `CERTIFICADO` solo si la conclusión es favorable.
- El informe exige evaluación consolidada completa, sincronización y evidencias completas, sin conflictos ni correcciones de sincronización pendientes. La verificación documental completa permite emitir sin una visita ficticia ni reabrir la suspendida de origen. Emitir el informe, publicar su versión técnica y pasar a `Pendiente de cierre` es una operación transaccional e idempotente.
- Resolver exige motivo, revisión examinada e idempotencia. Si la revisión cambió → `409`; `aceptar_enviada` requiere visita y asignación de origen vigentes. Una visita cancelada/reasignada conserva su envío en cuarentena sin aplicarlo; devolver no restituye permisos históricos.
- Se conservan conflictos, resoluciones y manifiestos anteriores. La finalización requiere nuevo manifiesto tras resolver, referido a datos vigentes y resoluciones de descarte, sin tratar como aplicada una operación descartada.
- Una conclusión ordinaria requiere informe vigente. Una conclusión anticipada de campo requiere acta válida y decisión motivada; referencia el acta, sin crear un informe ficticio. La ruta documental del Sprint 2 conserva sus soportes de revisión y nunca exige acta de inspección ni informe técnico.
- El funcionario no puede convertir directamente un resultado técnico desfavorable en favorable. Solicita corrección motivada en `Pendiente de cierre`, identificando informe y datos afectados; toda solicitud sin atención bloquea la conclusión.
- Solo el responsable técnico vigente atiende. Se confirman conjuntamente nueva versión de datos técnicos, informe y atención con motivo, autor, fecha, hash, referencias e historial. Las versiones anteriores permanecen consultables; no basta reemplazar el PDF. La emisión correctiva atiende su solicitud en esa misma operación, sin exigir que estuviera atendida de antemano.
- Si cambia el resultado técnico, solo el responsable vigente ejecuta la transición de corrección, con solicitud y motivo; el funcionario no puede hacerlo ni modificar el snapshot anterior.
- La corrección no reabre visitas ni plazos. Las versiones/asignaciones obsoletas, la segunda atención incompatible y las solicitudes o atenciones tras un estado terminal se rechazan con `409`; el reintento idéntico no duplica efectos.
- La verificación presencial y sus continuaciones permanecen `En verificación`; conservan inspección, levantamiento y actas originales sin una nueva oportunidad de presentación. Una reasignación es expresa, conserva autorías y restringe al inspector anterior a la cuarentena histórica.
- Todos los PDF llevan encabezado y marca de agua «DEMOSTRACIÓN ACADÉMICA — SIN VALIDEZ ADMINISTRATIVA» en todas las páginas (RNF-015); el panel muestra las fotos disponibles y las constancias de imposibilidad justificadas.
- Certificado: expedición según servidor en Lima; caducidad dos años calendario después, con aniversario 29/02→28/02 si no existe y sin desplazar por inhábil; referencia de renovación 30 días hábiles anteriores, excluyendo fines de semana/feriados/días no laborables. Se guardan las fechas emitidas, sin recalcularlas al reintentar o cambiar el calendario.
- La generación de conclusión y certificado es idempotente y transaccional. No puede existir certificado sin conclusión favorable y sin informe técnico del flujo ordinario.
- Los estados `Concluido favorable` y `Concluido desfavorable` son terminales: solo consulta y descarga ordinarias. La purga excepcional es mantenimiento, sin nuevas transiciones del procedimiento.

**Consulta completa de RF-026:** el administrado consulta estado, historial de actuaciones y documentos propios; las descargas son autenticadas y se comprueba la pertenencia al expediente. Con esto se completa el requisito que se inició parcialmente en Sprint 1.

**Pruebas mínimas:** resolución de conflictos, levantamiento completo/incompleto, verificación documental y presencial, vencimiento sin automatismo de cierre, cierre anticipado con acta, informe bloqueado por sincronización/conflicto incompleto, conclusión incompatible con resultado técnico, certificado solo favorable, idempotencia de documentos, consulta de historial y descarga no autorizada; resolución con revisión obsoleta (`409`), aceptación vedada para asignación cancelada/reasignada, descarte trazable y nuevo manifiesto, devolución con corrección pendiente que bloquea informe, recepción tardía idempotente sin transición ni verificación y límites temporales según reloj del servidor; verificación documental sin visita ficticia, presencial suspendida/continuada sin salir de En verificación, emisión inicial sin circularidad, corrección técnica que bloquea conclusión, versiones técnicas y PDF anteriores intactos, atención atómica/idempotente, responsable reasignado autorizado y anterior denegado, corrección tras cierre rechazada.

**Respaldo/restauración incluido — RNF-013:** demostrar restauración de BD y archivos de la copia diaria en un entorno separado, con pérdida máxima de 24 h y evidencia del resultado antes de la presentación. Mantiene prioridad Should, incluido por acuerdo.

**Pruebas adicionales de cierre:** informe ordinario bloqueado por ítem sin respuesta o No aplica sin motivo; alternativas K20/K21 y panel con imposibilidad justificada; fechas bisiestas, caducidad en inhábil y resta de 30 días hábiles; idempotencia de las fechas; depuración de visitas suspendidas resueltas mediante verificación documental sin borrar datos pendientes; restauración de BD y archivos.

**Mantenimiento excepcional — las reglas del procedimiento:** en este sprint se incorpora la herramienta de purga autenticada para ADMIN, fuera de la interfaz ordinaria y sin endpoint REST. Solo elimina expedientes demostrativos concluidos expresamente seleccionados y sus agregados/archivos. Conserva cuentas, catálogos y un registro independiente e inmutable de actor, motivo, fecha, UUID y resultado, junto con las actuaciones de mantenimiento que no dependen del expediente eliminado. La excepción a los triggers está restringida a la función de mantenimiento; la API no puede eludirlos. La transacción confirma borrado de datos, registro e historial de mantenimiento; la limpieza de archivos posterior es reintentable y no se marca completa con pendientes. No se convierte en edición de parámetros o auditoría avanzada por interfaz de RF-029.

**Pruebas de mantenimiento:** roles no autorizados y ADMIN por API ordinaria sin acceso a purga; rechazo de borradores/en trámite y de selección parcialmente inválida; purga de agregado concluido completo con registro conservado; cuentas/catálogos y otros expedientes intactos; triggers ordinarios activos; fallo de limpieza de archivos, reintento con mismo identificador sin repetir el borrado de BD y rechazo de parámetros incompatibles. Solo se usan datos ficticios; no forma parte del camino ordinario del administrado.

**Opcional — RF-025:** si hay capacidad, implementar consulta pública por código/QR, de solo lectura, con respuesta que no revele registros inexistentes ni datos restringidos. No se exponen documentos ni fotografías. Esta función no es precondición para emitir el certificado demostrativo.

---

## 3. Definition of Done (DoD)

### 3.1 DoD común a todos los sprints

- [ ] El guion de demostración del sprint se ejecuta desde un clon limpio con los proyectos npm actuales, usando datos ficticios; provisionamiento reproducible pendiente. Contenedores: pendiente de confirmar.
- [ ] Las reglas de negocio se validan en la API y tienen pruebas unitarias o de integración según corresponda.
- [ ] Cada endpoint protegido valida rol y alcance por pertenencia; se prueban accesos permitidos y denegados.
- [ ] Todo cambio de estado usa la función de transición común y escribe el historial en la misma transacción.
- [ ] Las operaciones críticas son idempotentes y sus reintentos no duplican efectos.
- [ ] Las migraciones se aplican sobre una base de datos vacía; el esquema queda reproducible.
- [ ] No se registran datos personales restringidos en URL, logs o mensajes de error; archivos privados no son ejecutables y se validan por tipo real y tamaño.
- [ ] El tramo E2E del sprint está integrado en el camino dorado y pasa en CI.
- [ ] Los DTO de NestJS y tipos del frontend se mantienen coherentes; documentación OpenAPI y .env.example pendientes de implementar.
- [ ] No quedan errores de tipo, compilación ni fallos de pruebas introducidos por el sprint.

### 3.2 Criterios de calidad por prioridad

- **Must:** se deben cumplir antes de dar por terminado el MVP, incluyendo HTTPS en el entorno desplegado, seguridad de credenciales, autorización, integridad, persistencia offline, documentos PDF y privacidad.
- **Should incluidos por acuerdo:** RNF-005, JWT actual de un día; política de inactividad pendiente de confirmar; RNF-013, copia diaria y restauración con pérdida máxima de 24 h. Mantienen prioridad Should y deben verificarse para aceptar el MVP acordado.
- **Should opcionales/diferidos:** accesibilidad, adaptabilidad desde 360 px, metas de rendimiento/usabilidad y verificador público continúan opcionales; correos, recuperación/verificación de correo, auditoría avanzada y edición de parámetros por interfaz permanecen diferidos. No bloquean la aceptación mientras no se incorporen expresamente.
- **Could:** estadísticas agregadas y disponibilidad del 98% como meta del entorno demostrativo.

---

## 4. Trazabilidad de requisitos funcionales

| Requisito | Sprint | Tratamiento en el MVP | Situación actual |
|---|---:|---|---|
| RF-001 Registro de cuenta | 0 | Must: registro básico; verificación por enlace, Should y diferida. | Parcial: Registro API y formulario web conectados; falta identidad completa y privacidad. |
| RF-002 Autenticación | 0 | Must. | Parcial: Login JWT y logout local; sin desactivación. |
| RF-003 Recuperación de contraseña | — | Should, fuera del MVP junto con el servicio de correo. | Diferido: Sin recuperación ni correo. |
| RF-004 Borrador de solicitud | 1 | Must. | Parcial: Creación title/description; sin edición de borrador. |
| RF-005 Declaración jurada PDF | 1 | Must. | Pendiente: Carga genérica; no declaración identificada/obligatoria. |
| RF-006 Pago simulado | 1 | Must; registro/anulación solo del propietario en Borrador, pago vigente único, historial e idempotencia. | Parcial: Recibo e importe libre; ADMIN también puede registrar; sin anulación. |
| RF-007 Presentación inmutable y cargo | 1 | Must; inicia y muestra el plazo general de nueve días hábiles. | Pendiente: Sin presentación diferenciada ni cargo. |
| RF-008 Revisión y observaciones documentales | 2 | Must. | Parcial: Guarda decisiones y motivos en historial de revisiones visible; falta requerimiento único y revisión individualizada. |
| RF-009 Subsanación documental | 2 | Must. | Pendiente: Sin subsanación. |
| RF-010 Clasificación de riesgo | 2 | Must; discrepancia bajo/medio visible con procedimiento/importe conservados; cierre motivado si alto/muy alto. | Pendiente: Sin clasificación de riesgo. |
| RF-011 Asignación de inspector | 2 | Must; conserva asignaciones históricas para el alcance de recepción del Sprint 3. | Parcial: Asigna inspectorId; sin estado activo ni historial. |
| RF-012 Programación/reprogramación | 2–4 | Must: programación inicial en Sprint 2; continuaciones de evaluación inicial en Sprint 3; verificación y sus continuaciones en Sprint 4. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-013 Descarga de visita para offline | 3 | Must. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-014 Checklist de 67 verificaciones | 3 | Must; respuesta explícita a todos los ítems, aplicabilidad justificada y ruta K20/K21 manual y trazable. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-015 Fotografías | 3 | Must; evidencia o imposibilidad justificada conservada para el panel/informe. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-016 Persistencia local | 3 | Must. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-017 Sincronización y conflictos | 3–4 | Must: detección, cuarentena histórica y manifiestos en Sprint 3; resolución con revisión vigente y nuevo manifiesto en Sprint 4. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-018 Suspensión y acta | 3–4 | Must: suspensión y continuación inicial en Sprint 3; aplicar el flujo a verificaciones y cierre excepcional en Sprint 4. Efecto sobre plazos mediante actuación motivada y saldo conservado. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-019 Observaciones subsanables y plazo | 3 | Must; hasta tres días desde recepción/disponibilidad del acta, contando desde el día hábil siguiente. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-020 Presentación de levantamiento | 4 | Must; recepción tardía conservada sin transición ni habilitación de verificación. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-021 Verificación del levantamiento | 4 | Must; responsable vigente, documental sin visita ficticia o presencial programada, con continuaciones y observaciones originales conservadas. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-022 Informe técnico | 4 | Must; versión técnica consolidada e inmutable e informe emitidos después de finalizar visitas o completar verificación documental; incluye versiones correctivas. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-023 Conclusión motivada | 2 y 4 | Must: cierres documentales desfavorables en Sprint 2; cierres técnicos y solicitud/atención de correcciones antes de concluir en Sprint 4. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-024 Certificado demostrativo | 4 | Must; solo cierre favorable ordinario, con fechas de expedición/caducidad/referencia de renovación calculadas y congeladas. | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-025 Verificador público por código/QR | 4, opcional | Should; puede diferirse sin bloquear el MVP. | Opcional pendiente: Sin verificador. |
| RF-026 Consulta, historial y documentos propios | 1 y 4 | Must: consulta inicial en Sprint 1; cobertura completa en Sprint 4. | Parcial: Listado filtrado e historial de revisiones; faltan historial general y descargas. |
| RF-027 Correos automáticos | — | Should, fuera del MVP. El historial del portal mantiene la trazabilidad. | Diferido: Sin correo. |
| RF-028 Gestión de usuarios y roles | 0 | Must. | Parcial: listado y cambio de roles por API/panel; faltan creación interna, edición y desactivación. |
| RF-029 Auditoría avanzada y parámetros por interfaz | — | Should; auditoría obligatoria del expediente y parámetros semilla sí se incluyen. | Diferido: Sin auditoría avanzada ni parámetros por interfaz. |
| RF-030 Estadísticas agregadas | — | Could, fuera del MVP base. | Opcional pendiente: Sin estadísticas. |

La purga excepcional las reglas del procedimiento se entrega como mantenimiento en Sprint 4, con registro independiente y pruebas de permisos/inmutabilidad; no agrega un RF ni cambia las prioridades MoSCoW de esta tabla.

### 4.1 Plazos y calendario las reglas del procedimiento

| Regla | Sprint | Verificación acumulativa |
|---|---|---|
| Siete días hábiles del procedimiento | 1 | Acto inicial de presentación, vencimiento y alerta visibles para ambos procedimientos; reintento sin reinicio. |
| Dos días hábiles documentales | 2 | Publicación del requerimiento como inicio; recepción tardía marcada; pausa/reanudación explícita conserva saldo e historial. |
| Suspensiones de diligencia y acta de observaciones | 3 | Causa y acta; afectación del cómputo decidida por funcionario; recepción/disponibilidad del acta inicia hasta tres días, sin confiar en el reloj local. |
| Levantamiento y decisión posterior | 4 | Recepción antes/después del límite, tardía sin verificación ni reinicio y sin cierre automático. |

Se prueban fines de semana, feriados y días no laborables, límites de fin de día en `America/Lima`, pausas/reanudaciones y conservación de vencimientos anteriores. En una suspensión a mitad de día solo se consumen los días hábiles de cómputo completos anteriores; ese día no se consume y el saldo continúa desde el día hábil siguiente a la reanudación. Se prueban pausas sucesivas sin reinicio ni doble descuento del consumo acumulado.

## 5. Trazabilidad de requisitos no funcionales

| Requisito | Tratamiento y aplicación | Criterio de verificación | Situación actual |
|---|---|---|---|
| RNF-001 Rendimiento (Should) | Opcional; evaluación final si se incluye | Con 20 usuarios concurrentes y 1000 expedientes ficticios, p95 de consultas ordinarias ≤ 3 s; excluir archivos y proveedor de correo. | Pendiente de confirmar mediante medición. |
| RNF-002 HTTPS (Must) | Incluido; 0 y despliegue final | Todo acceso desplegado por HTTPS; redirección desde HTTP y sin rutas desprotegidas. | Local HTTP; HTTPS externo pendiente de confirmar. |
| RNF-003 Credenciales (Must) | Incluido; 0 | bcrypt, coste 10, mínimo actual de 6 caracteres; 12 pendiente de confirmar; sin texto plano ni cifrado reversible. | bcrypt coste 10; mínimo 6. Objetivo de 12 pendiente de confirmar. |
| RNF-004 Autorización (Must) | Incluido; todos | Rol y pertenencia en cada operación protegida, con pruebas permitidas/denegadas y alcance histórico limitado. | Parcial: rol/propiedad/asignación; faltan actores y reglas previstas. |
| RNF-005 Sesiones (Should) | Incluido por acuerdo; 0 y 3 | JWT fijo de un día; logout local. Inactividad de 30 minutos y preservación offline pendientes de confirmar/implementar. | JWT de un día; inactividad de 30 minutos pendiente de confirmar. |
| RNF-006 Integridad (Must) | Incluido; todos | Transacciones e idempotencia en presentación, sincronización y documentos; efectos e historial confirmados juntos. | Parcial: restricciones BD; sin idempotencia general; escritura atómica del historial del expediente y transacción de roles implementadas. |
| RNF-007 Historial (Must) | Incluido; todos | Actor, acción, objeto, estado anterior/nuevo, fecha del servidor y motivo cuando corresponda; mantenimiento con historial independiente. | Parcial: historial de revisiones con autor/fecha/motivo; falta historial general de actuaciones. |
| RNF-008 Offline (Must) | Incluido; 3 | Cerrar/reabrir sin conexión conserva todos los borradores con confirmación local mostrada. | Pendiente: sin PWA ni persistencia de inspecciones. |
| RNF-009 Sincronización (Must) | Incluido; 3 y 4 | Repetir cinco veces la misma petición no duplica inspecciones ni evidencias; resoluciones y reintentos trazables. | Pendiente: sin sincronización. |
| RNF-010 Accesibilidad (Should) | Opcional; cada interfaz incluida | Teclado, foco visible, etiquetas asociadas, errores textuales y contraste AA en los componentes evaluados. | Pendiente de validación; etiquetas requieren revisión. |
| RNF-011 Compatibilidad (Must) | Incluido; 0, 3 y 4 | Portal en las dos versiones estables más recientes de Chrome y Firefox a la fecha de evaluación; PWA en Chrome para Android 10+ con cámara real. | Pendiente de confirmar mediante pruebas; sin PWA. |
| RNF-012 Adaptabilidad (Should) | Opcional; cada interfaz incluida | Desde 360 px sin desplazamiento horizontal principal; tablas extensas con contenedor propio. | Pendiente de validación responsiva. |
| RNF-013 Respaldo (Should) | Incluido por acuerdo; copias desde 1, restauración en 4 | Copia diaria de BD y archivos; restauración demostrada antes de la presentación y pérdida máxima de 24 h. | Sin scripts; operación externa pendiente de confirmar. |
| RNF-014 Disponibilidad (Could) | Opcional; despliegue | Meta 98% mensual, comprobación cada cinco minutos y registro de mediciones; no afirmar medición mensual sin período completo. | Pendiente de confirmar mediante medición. |
| RNF-015 PDF (Must) | Incluido; 1, 2, 3 y 4 | PDF legibles sin cortes, encabezado y marca de agua en todas las páginas, incluidas actas del Sprint 3 y conclusiones documentales del 2. | Pendiente: SIGITSE no genera documentos PDF. |
| RNF-016 Privacidad (Must) | Incluido; todos | Sin datos restringidos en URL/logs/errores/consulta pública; aviso y constancia en 0; depuración local tras cierre operativo y sincronización completa en 3–4. | Parcial: controles de acceso; sin aviso ni constancia. |
| RNF-017 Archivos (Must) | Incluido; 1, 2, 3 y 4 | Tipo real y tamaño válidos, nombres internos no predecibles, almacenamiento no ejecutable y descarga autorizada. | Parcial: tipo/tamaño declarados; sin descargas/limpieza acreditadas. |
| RNF-018 Usabilidad (Should) | Opcional; ensayo final si se incluye | Cinco participantes ajenos al equipo; al menos cuatro completan solicitud y consulta de estado sin ayuda directa. | Pendiente de confirmar mediante ensayo. |

---

## 6. Criterio de finalización del MVP

El MVP se considera completo cuando se ejecuta el camino ordinario de extremo a extremo —registro, presentación, revisión, clasificación bajo/medio, programación, inspección, sincronización, levantamiento cuando corresponda, informe, conclusión favorable y certificado— y se prueban las rutas desfavorables y excepcionales descritas en los sprints. Deben estar implementados todos los requisitos **Must** y los Should incluidos expresamente (RNF-005 y RNF-013), sin cambiar su prioridad. Los demás **Should/Could** opcionales o diferidos no impiden la aceptación del MVP.
