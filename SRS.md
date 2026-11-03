# **ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (SRS) — SIGITSE**

**Sistema de Gestión Digital del Procedimiento de Inspección Técnica de Seguridad en Edificaciones para Establecimientos de Riesgo Bajo y Medio**

| Campo | Valor |
|---|---|
| **Proyecto** | SIGITSE |
| **Contexto** | Proyecto académico del curso de Desarrollo de Software. La Municipalidad Distrital de San Miguel, Lima, es una referencia del dominio; no es un cliente contratado ni ha autorizado el uso del sistema. |
| **Integrantes** | Vilchez Tello, Rodrigo Alonso (20240031B); Valverde Gonzáles, Yoshua Natanael (20221174F); Muñuico Ortiz, Daniel Emmanuel (20234180J); Izquierdo Ayllón, Khalid Zaid (20204122A) |

**Entrega del 15/12/2026:** el [plan operativo](docs/planning/PLAN_ENTREGA_2026.md) selecciona un subconjunto demostrativo. Los Must diferidos conservan su prioridad de producto; no se afirma cumplimiento integral de este SRS.

## Implementación actual y alcance pendiente

El alcance previsto se conserva: una función ausente no se considera cancelada. Las reglas de dominio que siguen describen el objetivo del MVP, salvo cuando se identifica expresamente el comportamiento actual. **Pendiente de confirmar** significa que el repositorio no permite acreditar una decisión, operación externa o aceptación; **pendiente de implementar** indica ausencia de soporte en el código revisado.

- **Modelo actual:** User, ItseRequest, Document, Payment, ItseRequestHistory y BusinessHoliday en `sigitse-backend/prisma/schema.prisma`. Identificadores enteros autoincrementales; hay historial de recepción, archivos, pagos, asignación y revisión, y calendario de feriados; faltan visita, checklist, riesgo, declaración y certificado.
- **Roles efectivos:** ADMINISTRADO, INSPECTOR y ADMIN. ADMIN puede listar todo, revisar, asignar y registrar pagos; INSPECTOR lista/revisa solicitudes asignadas; ADMINISTRADO lista/paga las propias. Crear solicitudes exige autenticación, pero no restringe el rol. Cargar documentos exige acceso al expediente. No existe rol separado de funcionario ni verificador público. La separación futura de funcionario/administrador queda pendiente de confirmar; los actores del dominio se conservan.
- **Solicitud actual:** title y description obligatorios; creación directa en PENDIENTE. No hay borrador editable, presentación diferenciada, clasificación ni número administrativo. startedAt/dueAt se calculan al crear y hay calendario de Lima; falta iniciar el cómputo con la presentación formal.
- **Revisión actual:** ADMIN o INSPECTOR asignado cambia status a APROBADO, OBSERVADO o RECHAZADO. Cada revisión conserva acción, observation, autor y fecha en ItseRequestHistory, junto al cambio de estado mediante transacción compartida con el historial; las observaciones/rechazos exigen motivo y se consultan desde el panel. No equivale a conclusión motivada.
- **Asignación actual:** ADMIN selecciona un User con role INSPECTOR; asigna inspectorId y cambia a EN_REVISION. Registra la asignación en el historial; no comprueba estado de origen, cuenta activa ni agenda.
- **Pago actual:** registro demostrativo de receiptNumber y amount proporcionados por el cliente, con fecha de servidor. Un Payment por solicitud y recibo único. ADMIN también puede registrar; INSPECTOR no. No hay tasa por riesgo, validación de importe positivo, anulación ni idempotencia. La restricción única evita otra fila, pero no devuelve el resultado original de un reintento.
- **Archivos actuales:** carga genérica PDF/PNG/JPEG de hasta 10 MiB mediante ParseFilePipe; escritura en disco con Multer y metadatos en Document. No hay categoría de declaración jurada ni versionado documental; sí existe descarga autenticada con control de acceso. La validación declarada no acredita pruebas reales de contenido malicioso o archivos inválidos.
- **Estados efectivos:** PENDIENTE, EN_REVISION, OBSERVADO, APROBADO y RECHAZADO. No hay máquina de transiciones ni estados terminales protegidos. Los estados detallados del procedimiento siguen pendientes; no se equipara APROBADO con certificado emitido.
- **Pruebas:** hay pruebas unitarias de roles en JWT, validación de motivos y alcance de solicitudes, más una regresión HTTP con PostgreSQL que acredita persistencia, consulta privada y atomicidad de revisiones; el E2E original de la raíz sigue siendo básico. No acreditan el flujo completo del MVP.
- **Pendiente de confirmar:** despliegue externo, versión real de PostgreSQL, provisionamiento de cuentas internas, ejecución previa de pruebas, aceptación de sprints, tarifas y vigencia de referencias normativas. Estas últimas se conservan como antecedentes del dominio, sin validar su vigencia mediante el código.

## **1. INTRODUCCIÓN**

### **1.1 Propósito**

El sistema gestiona el expediente demostrativo de ITSE: solicitud, declaración jurada, pago simulado, revisión y subsanación documental, clasificación del riesgo, asignación y programación, inspección con checklist y fotografías (con o sin conexión), levantamiento de observaciones, conclusión y certificado demostrativo.

### **1.2 Alcance del Sistema**

#### **1.2.1 Identificación del producto**

SIGITSE: Sistema de Gestión Digital del Procedimiento de Inspección Técnica de Seguridad en Edificaciones para Establecimientos de Riesgo Bajo y Medio.

#### **1.2.2 Naturaleza del proyecto**

SIGITSE es un prototipo académico con un portal React y una API REST NestJS. El portal específico del funcionario y la PWA del inspector están previstos, sin implementación actual. Gestiona expedientes demostrativos de ITSE posterior al inicio de actividades para establecimientos de riesgo bajo o medio, tomando como referencia normativa los procedimientos nacionales estandarizados y la documentación publicada por la Municipalidad Distrital de San Miguel.

Usuarios, pagos, actuaciones y documentos son demostrativos y **no producen efectos administrativos reales**. La inspección en campo sigue siendo presencial; el sistema organiza el flujo y conserva evidencia e historial.

#### **1.2.3 Delimitación del procedimiento**

El alcance previsto comprende los dos procedimientos independientes publicados por la Municipalidad Distrital de San Miguel:

1. ITSE posterior al inicio de actividades, riesgo **bajo**.
2. ITSE posterior al inicio de actividades, riesgo **medio**.

Supuestos de aplicación (**N**):

- Establecimientos que no requieren licencia de funcionamiento.
- Establecimientos con licencia cuyo certificado ITSE no fue renovado antes de vencer.
- Establecimientos con certificado ITSE modificados o ampliados con afectación de sus condiciones iniciales de seguridad.

No se implementa el otorgamiento de licencia ni modalidades derivadas de él.

#### **1.2.4 Visión general de la solución**

Flujo de extremo a extremo: solicitud en línea → declaración jurada → pago simulado → revisión documental → clasificación del riesgo → programación → inspección con checklist y fotografías → levantamiento de observaciones → conclusión → certificado demostrativo.

### **1.3 Criterios de alcance**

**Marcas de origen.** **N:** regla procedente de norma, procedimiento estandarizado o formulario oficial. **D:** decisión de diseño del prototipo. No implican autorización para tramitar procedimientos reales.

**Prioridad MoSCoW.** Una función es **Must** solo si, sin ella, no puede recorrerse el expediente desde la presentación hasta el certificado demostrativo. **Should:** importante, pero el flujo base funciona sin ella. **Could:** deseable. **Won't:** sección 2.3.

**Formulario técnico.** Las verificaciones del checklist (sección 3.5.11) reproducen funcionalmente el Anexo 6a (CENEPRED, ofrecido por la Municipalidad Distrital de San Miguel). No certifican que el formulario de 2018 permanezca sin modificaciones. El alcance previsto exige conservar referencia y versión del formulario y no afirma cumplimiento municipal.

**Documentación municipal.** La vigencia de la ordenanza, tasas, requisitos publicados y formularios nacionales está pendiente de confirmar; el código no permite verificarla. No se dispone de una ficha íntegra del TUPA municipal, por lo que se usan identificadores internos (sección 3.5.1) y roles funcionales en lugar de códigos o autoridades oficiales del TUPA.

### **1.4 Definiciones, Acrónimos y Abreviaturas**

- **ITSE posterior al inicio de actividades:** inspección posterior al inicio de la actividad, aplicable a los supuestos de la sección 1.2.3. Es el único tipo previsto en el alcance; el modelo actual aún no distingue procedimientos ni riesgos.
- **Nivel de riesgo:** bajo, medio, alto o muy alto, determinado con la matriz oficial; no con una regla de área y aforo.
- **Certificado de ITSE:** documento posterior a una conclusión favorable. En SIGITSE solo existe como certificado demostrativo sin validez administrativa.
- **Administrado:** persona natural o jurídica que solicita el procedimiento (propietario, representante legal o conductor/administrador).
- **Funcionario coordinador ITSE:** rol funcional que revisa, clasifica, programa y registra el cierre demostrativo. No equivale a una autoridad resolutora del TUPA.
- **Inspector:** rol que ejecuta la inspección y verifica levantamientos. Su autorización profesional se registra manualmente.
- **Subsanación documental:** corrección de defectos de presentación de la solicitud o sus documentos (sección 3.5.8).
- **Levantamiento de observaciones:** corrección de observaciones subsanables sobre condiciones no relevantes en términos de riesgo (sección 3.5.12). Es un flujo distinto de la subsanación documental.
- **Visita de verificación:** visita presencial incluida en el expediente para verificar el levantamiento. No se denomina VISE.
- **ECSE / VISE:** procedimientos con finalidad propia, fuera de alcance.
- **TUPA / LPAG:** Texto Único de Procedimientos Administrativos / Ley del Procedimiento Administrativo General.
- **RITSE:** registro de inspectores y profesionales vinculado a ITSE; no existe consulta en línea en este sistema.
- **GLP:** gas licuado de petróleo.
- **Silencio administrativo positivo:** consecuencia jurídica del procedimiento de evaluación previa al vencer el plazo; no equivale a verificación física (sección 3.5.16).
- **CAT-ITSE-POST-2018:** catálogo previsto de verificaciones del checklist.
- **PWA / MVP / RF / RNF / CU:** aplicación web progresiva / producto mínimo viable / requisito funcional / requisito no funcional / caso de uso.

### **1.5 Referencias**

**Estándares metodológicos** (no son legislación peruana): ISO/IEC/IEEE 29148:2018; IEEE 830-1998.

**Normas y procedimientos:**

1. D.S. N.º 002-2018-PCM, Reglamento de ITSE, y su modificación transitoria D.S. N.º 064-2018-PCM.
2. R.J. N.º 016-2018-CENEPRED/J y Manual de Ejecución de ITSE.
3. D.S. N.º 043-2021-PCM, procedimientos estandarizados de ITSE (riesgo bajo y medio).
4. Ley N.º 28976 y su TUO (D.S. N.º 163-2020-PCM).
5. Ley N.º 27444 y la edición oficial de su TUO (D.S. N.º 006-2026-JUS).
6. Ley N.º 29733 y su Reglamento (D.S. N.º 016-2024-JUS).
7. D. Leg. N.º 1412; D.S. N.º 029-2021-PCM y modificaciones (D.S. N.º 075-2023-PCM, D.S. N.º 098-2025-PCM).
8. Resolución N.º 001-2025-PCM/SGTD (lineamiento de accesibilidad).
9. Ley N.º 27269 y D.S. N.º 052-2008-PCM (firma digital, excluida).
10. Ordenanza N.º 523/MDSM y Acuerdo de Concejo Metropolitano N.º 384.
11. Reglamento Nacional de Edificaciones y Código Nacional de Electricidad (referencias técnicas de los formularios).

**Formularios y publicaciones municipales:**

12. Anexos 1, 2, 3, 4, 6/6a, 9, 13 y 18 del Manual de Ejecución de ITSE: Anexo 1 (solicitud), Anexo 4 (declaración jurada de ITSE posterior), Anexo 6a (informe de verificación), Anexo 13 (certificado de ITSE posterior).
13. Municipalidad Distrital de San Miguel, "Procedimientos y servicios exclusivos de ITSE": https://munisanmiguel.gob.pe/wp-content/uploads/2025/11/ITSE_2026.pdf
14. TUO de la Ley N.º 27444 (D.S. N.º 006-2026-JUS), primera edición oficial, MINJUSDH: https://www.gob.pe/institucion/minjus/informes-publicaciones/8441836-primera-edicion-oficial-del-texto-unico-ordenado-de-la-ley-n-27444-ley-del-procedimiento-administrativo-general-aprobado-por-el-decreto-supremo-n-006-2026-jus-actualizada-al-8-07-2026

Los formularios generales de ITSE de San Miguel están separados de los específicos de bodegas, que quedan fuera de alcance.

---

## **2. DESCRIPCIÓN GENERAL Y GESTIÓN DEL ALCANCE**

### **2.1 Perspectiva del Producto**

SIGITSE es un sistema nuevo e independiente. Actualmente tiene un frontend React/TypeScript con Vite y un backend NestJS/TypeScript con adaptador Express, Prisma y PostgreSQL. Ambos proyectos tienen package.json y package-lock.json propios y usan npm; no existe un workspace pnpm. El backend es un monolito modular con controladores y servicios. Los archivos se almacenan mediante Multer en ./uploads. La API escucha en el puerto 3000 y admite el origen http://localhost:5173. No se integra con sistemas estatales. La PWA, Docker Compose, HTTPS de despliegue y versión operativa de PostgreSQL están pendientes de confirmar o implementar. Existen migraciones versionadas; su aplicación y el flujo HTTP de revisiones se prueban en una BD temporal aislada.

### **2.2 Alcance priorizado (MoSCoW)**

| Prioridad | Funciones |
|---|---|
| **Must** (núcleo del MVP) | Registro y autenticación. Borrador y presentación de solicitudes. Declaración jurada y documentos. Pago simulado. Revisión y subsanación documental. Clasificación manual asistida del riesgo. Asignación, programación y suspensión. Checklist y fotografías. Operación sin conexión y sincronización. Levantamiento de observaciones y su verificación. Informe del inspector, documento de conclusión y certificado demostrativo. Consulta del expediente e historial por el administrado. Gestión de usuarios y roles. |
| **Should** | Correos automáticos. Recuperación de contraseña. Verificación de correo por enlace. Consulta pública por código y QR. Consulta avanzada de auditoría y gestión de parámetros y calendario desde la interfaz. |
| **Could** | Reportes estadísticos agregados por estado y riesgo. |

El historial de actuaciones del expediente (RNF-007) y la gestión de usuarios internos y roles (RF-028) son Must. Son Should las funciones adicionales de consulta de auditoría y edición de parámetros/calendario desde la interfaz; en el MVP estos parámetros pueden cargarse por datos semilla.

### **2.3 Fuera de alcance (Won't)**

- Riesgo alto y muy alto.
- ITSE previa y licencias de funcionamiento.
- Renovación como procedimiento autónomo.
- ECSE y VISE como procedimientos autónomos.
- Duplicados y transferencias.
- Recursos administrativos, sanciones, clausuras y revocación.
- Pagos reales.
- Firma digital certificada.
- Integraciones estatales y migración histórica.
- SMS y mensajería instantánea.

La visita de verificación de observaciones no se denomina VISE: el reglamento reserva ese término para una actuación con finalidad propia.

### **2.4 Actores y permisos**

**Situación actual:** La tabla siguiente conserva los actores del dominio. La implementación efectiva usa tres roles y permite a ADMIN revisar y pagar; por tanto, la separación de funciones indicada como objetivo aún no está implementada.

| Actor | Funciones |
|---|---|
| Administrado | Gestionar su cuenta; presentar solicitudes; adjuntar documentos; subsanar; presentar levantamientos; consultar y descargar sus documentos. |
| Funcionario coordinador ITSE | Revisar requisitos y procedencia; registrar clasificación; observar documentos; asignar inspector; programar; revisar integridad del expediente y registrar el cierre demostrativo. |
| Inspector | Acceder a visitas asignadas; descargar información; inspeccionar; registrar respuestas, fotografías, actas e informes; como responsable técnico vigente, verificar observaciones y atender correcciones previas al cierre conservando la autoría anterior. |
| Administrador del sistema | Gestionar cuentas internas y roles (Must); ejecutar mantenimiento excepcional de purga según sección 3.4, fuera de la interfaz ordinaria; gestionar parámetros/calendario desde la interfaz y consultar auditoría avanzada (Should). |
| Visitante público | Consultar un certificado demostrativo con código o QR (Should). |

Reglas **D** de permisos (se validan en backend, RNF-004):

- El administrador técnico no adquiere automáticamente permisos de inspector o funcionario.
- El funcionario no puede modificar las respuestas técnicas del inspector; puede solicitar una corrección motivada y reasignar expresamente al responsable técnico activo, conservando las asignaciones y autorías anteriores.
- El inspector no puede registrar un pago ni aprobar el cierre administrativo.
- Cada administrado accede únicamente a sus expedientes.
- Las cuentas desactivadas conservan sus actuaciones históricas.
- La autorización profesional del inspector se registra manualmente; no existe consulta en línea del RITSE.

### **2.5 Restricciones y Suposiciones**

- Se observa la Ley N.º 29733 y su Reglamento (sección 3.4).
- El portal asume conectividad estable; la PWA tolera conectividad intermitente trabajando con visitas descargadas (sección 3.5.13).
- Entorno académico y demostrativo; no reemplaza un sistema municipal real.
- Se asumen de 2 a 5 inspectores.
- Todos los datos de la demostración son ficticios.

---

## **3. REQUISITOS ESPECÍFICOS DEL SISTEMA**

### **3.1 Lista Maestra de Requisitos Funcionales (RF)**

Distribución: **25 Must**, **4 Should** (RF-003, RF-025, RF-027, RF-029), **1 Could** (RF-030). Los errores de validación devuelven código HTTP 4xx con detalle por campo.

| Código | Canal | Requisito y criterio de aceptación | MoSCoW | Situación actual |
|---|---|---|---|---|
| RF-001 | API / Web | Registrar cuenta de administrado con correo único; correo duplicado devuelve 409. La verificación por enlace es opcional (Should) y no bloquea el registro ni el flujo base del MVP. | Must (verificación: Should) | Parcial: Registro API y formulario web conectados; falta identidad completa y privacidad. |
| RF-002 | API / Web / PWA | Autenticar y cerrar sesión. Credenciales inválidas devuelven 401; cuenta desactivada, 403. Abre el panel según el rol. | Must | Parcial: Login JWT y logout local; sin desactivación. |
| RF-003 | API / Web | Recuperar contraseña mediante enlace temporal de un solo uso. Requiere el servicio de correo (RF-027); ambas funciones quedan fuera del MVP. | Should | Diferido: Sin recuperación ni correo. |
| RF-004 | Web / API | Crear y editar borrador de solicitud con los campos y validaciones de la sección 3.5.3. | Must | Parcial: Creación title/description; sin edición de borrador. |
| RF-005 | Web / API | Descargar el formato de declaración jurada y adjuntar el PDF suscrito (tipo real PDF, ≤ 10 MB). Sin PDF válido no se permite presentar (RF-007). | Must | Pendiente: Carga genérica; no declaración identificada/obligatoria. |
| RF-006 | Web / API | Registrar pago simulado antes de presentar: importe según sección 3.5.1 (congelado al presentar), número de operación demostrativa y aviso de simulación visible. Solo el administrado propietario puede anularlo mientras el expediente sea Borrador, con motivo, historial e idempotencia; un nuevo pago se inserta sin reactivar el anulado (sección 3.5.9). | Must | Parcial: Recibo e importe libre; ADMIN también puede registrar; sin anulación. |
| RF-007 | Web / API | Presentar la solicitud solo con pago Registrado y declaración válida; congelar la versión presentada (inmutable), generar número de expediente y cargo PDF, y registrar el inicio y vencimiento del plazo general de nueve días hábiles (sección 3.5.16). | Must | Pendiente: Sin presentación diferenciada ni cargo. |
| RF-008 | Web / API | Registrar revisión y observaciones documentales individualizadas (campo o documento, defecto, corrección solicitada), comunicadas agrupadas. | Must | Parcial: Guarda decisiones y motivos en historial de revisiones visible; falta requerimiento único y revisión individualizada. |
| RF-009 | Web / API | Presentar y revisar subsanación (texto y archivos) conservando todas las versiones; el funcionario acepta o mantiene la observación con motivación; las respuestas tardías se marcan. | Must | Pendiente: Sin subsanación. |
| RF-010 | Web / API | Registrar clasificación manual asistida y reporte de riesgo (sección 3.5.7). Una discrepancia bajo/medio conserva procedimiento solicitado e importe y queda visible y auditada; sin clasificación no se programa; alto o muy alto bloquea la continuación y exige cierre motivado. | Must | Pendiente: Sin clasificación de riesgo. |
| RF-011 | Web / API | Asignar inspector activo; el cambio queda auditado sin alterar el historial. | Must | Parcial: Asigna inspectorId; sin estado activo ni historial. |
| RF-012 | Web / API | Programar y reprogramar visitas iniciales, continuaciones y verificaciones de una misma inspección lógica; el solapamiento del mismo inspector devuelve 409; registrar comunicaciones y conservar vínculos de origen. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-013 | PWA | Descargar la visita asignada (datos mínimos, declaración y checklist) para uso sin conexión. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-014 | PWA | Completar comprobaciones previas y las 67 verificaciones con sus reglas de aplicabilidad y validación (sección 3.5.11). | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-015 | PWA | Capturar fotografías (JPEG/PNG ≤ 5 MB) y vincularlas a visita, ítem o hecho. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-016 | PWA | Persistir localmente respuestas y fotografías con confirmación local; el cierre o la reconexión no pierden datos. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-017 | PWA / API | Sincronizar con idempotencia (sin duplicados), detectar y resolver conflictos conservando versiones, y verificar el manifiesto vigente antes de finalizar. Una asignación histórica permite únicamente entregar evidencia en cuarentena, según sección 3.5.13. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-018 | PWA / API | Registrar suspensión con causa y descripción; generar acta y nueva fecha cuando corresponda (sección 3.5.10). | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-019 | PWA / API | Registrar observaciones subsanables y los días concedidos en acta, hasta tres días hábiles, con inicio y vencimiento según sección 3.5.12. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-020 | Web / API | Presentar levantamiento: escrito, observaciones atendidas, fotografías y sustento técnico. Conservar la recepción tardía sin habilitar verificación ni reabrir el flujo (sección 3.5.12). | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-021 | PWA / API | El inspector responsable vigente verifica el levantamiento por revisión documental sin visita ficticia o por visita presencial programada; resuelve cada observación original (Cumple Sí/No), conserva evidencias y no concede otra oportunidad de presentación. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-022 | API | Generar el informe técnico del inspector y el panel fotográfico desde una versión consolidada e inmutable de la inspección, con evaluación y sincronización completas; primero finalizar las visitas requeridas o la verificación documental y después emitir el informe. La corrección conserva versiones técnicas y documentales anteriores (sección 3.5.15). | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-023 | Web / API | Registrar la conclusión motivada del funcionario y generar el documento de conclusión según la ruta de cierre (sección 3.5.15); admitir el cierre documental desfavorable con sus soportes, sin acta de inspección ni informe técnico, e impedir un cierre favorable incompatible con el resultado técnico. | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-024 | API | Generar certificado demostrativo y código único solo tras cierre favorable, con marca de agua (sección 3.5.15). | Must | Pendiente: Sin entidades/operaciones del flujo correspondiente. |
| RF-025 | Web / API | Verificador público de solo lectura por código o QR, sin datos restringidos. | Should | Opcional pendiente: Sin verificador. |
| RF-026 | Web / API | Consultar expediente, historial y documentos propios con descarga autenticada. | Must | Parcial: Listado filtrado e historial de revisiones; faltan historial general y descargas. |
| RF-027 | API | Enviar correos de eventos (sección 3.5.17) y, si se habilitan RF-001/RF-003, mensajes de verificación y recuperación; registrar errores y reintentos. | Should | Diferido: Sin correo. |
| RF-028 | Web / API | Crear, editar y desactivar usuarios internos y asignar roles. | Must | Parcial: listado y cambio de roles por API/panel; faltan creación interna, edición y desactivación. |
| RF-029 | Web / API | Consultar auditoría avanzada y gestionar parámetros versionados (tasas, calendario) desde la interfaz. El historial obligatorio del expediente se mantiene en RF-026/RNF-007. | Should | Diferido: Sin auditoría avanzada ni parámetros por interfaz. |
| RF-030 | Web / API | Mostrar estadísticas agregadas por estado y riesgo. | Could | Opcional pendiente: Sin estadísticas. |

### **3.2 Desglose por Casos de Uso**

El sistema es el sujeto que responde, no un actor externo.

| CU | Actor y precondición | Flujo principal | Alternativa y resultado |
|---|---|---|---|
| CU-001 Acceder | Usuario con cuenta | Autenticar; comprobar estado; abrir panel por rol. | Cuenta inválida o desactivada: acceso rechazado. |
| CU-002 Presentar solicitud | Administrado autenticado | Completar; adjuntar declaración; simular pago; revisar; enviar; generar cargo. | Datos inválidos: mantener borrador e indicar errores. |
| CU-003 Revisar y clasificar | Funcionario; expediente presentado | Revisar procedencia y documentos; registrar clasificación y reporte; habilitar. | Observaciones: CU-004. Alto o muy alto: cierre motivado fuera de alcance. |
| CU-004 Subsanar documentos | Administrado; requerimiento único | Consultar; responder; adjuntar versión; enviar; revisión del funcionario. | Respuesta tardía: registrar y señalar para decisión. Si tras revisar la respuesta quedan observaciones pendientes, el funcionario registra conclusión desfavorable motivada y su documento, sin nueva ronda de observaciones. |
| CU-005 Programar | Funcionario; expediente en estado que admite la diligencia (secciones 3.5.10 y 3.5.12) | Elegir tipo, inspector y horario; vincular antecedentes; validar agenda y responsabilidad técnica; guardar comunicación. | Solapamiento: rechazar franja. La verificación presencial y sus continuaciones conservan En verificación. |
| CU-006 Inspeccionar | Inspector asignado | Verificar clasificación e implementación; responder y fotografiar; finalizar la diligencia o registrar observaciones subsanables. | Riesgo fuera de alcance o falta de implementación: acta y cierre motivado sin completar artificialmente el checklist. Suspensión: CU-008. |
| CU-007 Trabajar sin conexión | Inspector; visita descargada | Guardar local; continuar; recuperar conexión; sincronizar. | Conflicto: conservar versiones y solicitar resolución. |
| CU-008 Suspender | Inspector; diligencia iniciada | Seleccionar causa; describir; generar acta; el funcionario programa una continuación vinculada cuando proceda. | Reiteración prevista legalmente: remitir a cierre desfavorable. En verificación, conservar En verificación y el levantamiento de origen, sin nueva oportunidad. |
| CU-009 Levantar observaciones | Administrado; plazo habilitado | Presentar escrito y evidencias; enviar. | Recepción tardía antes del cierre: conservar y marcar sin cambiar a Levantamiento presentado ni habilitar verificación; el funcionario registra la decisión motivada. El vencimiento no cierra automáticamente. |
| CU-010 Verificar levantamiento | Inspector responsable vigente; levantamiento presentado en plazo | Elegir medio; revisar documentos o solicitar al funcionario una visita presencial; resolver cada observación; completar evaluación y emitir informe. | Persistencia: resultado desfavorable. Suspensión o continuación presencial conserva el levantamiento y no reinicia su plazo. |
| CU-011 Concluir | Funcionario; soportes completos según la ruta de cierre (sección 3.5.15) | Revisar integridad; registrar decisión motivada; generar documento de conclusión y, solo en cierre favorable ordinario, certificado; registrar en historial. | Cierre documental: soportes de clasificación o del requerimiento y sus respuestas, sin acta de inspección ni informe técnico. Cierre anticipado de campo: acta. Desfavorable: no generar certificado. Aviso por correo solo si se implementa RF-027. |
| CU-012 Verificar certificado | Visitante (Should) | Ingresar código o abrir QR; consultar datos permitidos. | Código inexistente: informar sin revelar otros registros. |
| CU-013 Administrar | Administrador | Gestionar usuarios y roles (Must); si se implementan las funciones Should, gestionar parámetros/calendario y consultar auditoría avanzada. | Operación incompatible con permisos: rechazar. |

### **3.3 Requisitos No Funcionales (RNF)**

Todos son verificables y de tipo **D**.

| Código | Requisito verificable | MoSCoW | Situación actual |
|---|---|---|---|
| RNF-001 Rendimiento | Con 20 usuarios concurrentes y 1000 expedientes de prueba, p95 de consultas ordinarias ≤ 3 s (excluye archivos y proveedor de correo). | Should | Pendiente de confirmar mediante medición. |
| RNF-002 Transporte | Todo acceso al entorno desplegado usa HTTPS. | Must | Local HTTP; HTTPS externo pendiente de confirmar. |
| RNF-003 Credenciales | Hash adaptativo con sal; nunca texto plano ni cifrado reversible; mínimo 6 caracteres en el registro actual (RegisterDto, @MinLength(6)); endurecimiento a 12 pendiente de confirmar. | Must | bcrypt coste 10; mínimo 6. Objetivo de 12 pendiente de confirmar. |
| RNF-004 Autorización | Validación en backend de rol y pertenencia del expediente en toda operación protegida. | Must | Parcial: rol/propiedad/asignación; faltan actores y reglas previstas. |
| RNF-005 Sesiones | JWT con vigencia fija de un día (AuthModule); logout elimina token y usuario del navegador, sin revocación de servidor. Inactividad de 30 minutos y conservación de borradores: pendientes de confirmar/implementar. | Should | JWT de un día; inactividad de 30 minutos pendiente de confirmar. |
| RNF-006 Integridad | Transacciones y claves de idempotencia en envío, sincronización y documentos. | Must | Parcial: restricciones BD; sin idempotencia general; escritura atómica del historial del expediente y transacción de roles implementadas. |
| RNF-007 Historial de actuaciones | Registrar usuario, acción, objeto, estado anterior y nuevo, fecha del servidor y motivo cuando corresponda. | Must | Parcial: historial de revisiones con autor/fecha/motivo; falta historial general de actuaciones. |
| RNF-008 Offline | Tras cerrar y reabrir la PWA sin conexión, recuperar todos los borradores con confirmación local mostrada. | Must | Pendiente: sin PWA ni persistencia de inspecciones. |
| RNF-009 Sincronización | Repetir 5 veces la misma petición no crea 5 inspecciones ni evidencias. | Must | Pendiente: sin sincronización. |
| RNF-010 Accesibilidad | Formularios operables con teclado, foco visible, etiquetas asociadas, errores textuales y contraste AA en los componentes evaluados. | Should | Pendiente de validación; etiquetas requieren revisión. |
| RNF-011 Compatibilidad | Portal en las dos versiones estables más recientes de Chrome y Firefox; PWA en Google Chrome para Android 10 o superior con cámara. Otros navegadores móviles y iOS quedan fuera del alcance del MVP. | Must | Pendiente de confirmar mediante pruebas; sin PWA. |
| RNF-012 Adaptabilidad | Vistas utilizables desde 360 px sin desplazamiento horizontal del contenido principal; las tablas extensas pueden tener contenedor propio. | Should | Pendiente de validación responsiva. |
| RNF-013 Respaldo | Copia diaria; restauración demostrada con pérdida máxima de 24 h de datos del servidor. | Should | Sin scripts; operación externa pendiente de confirmar. |
| RNF-014 Disponibilidad | Meta de 98% mensual del entorno demostrativo (comprobación cada 5 minutos); sin garantía contractual. | Could | Pendiente de confirmar mediante medición. |
| RNF-015 Documentos | PDF legibles, sin cortes de campos ni tablas; encabezado demostrativo en todas las páginas. | Must | Pendiente: SIGITSE no genera documentos PDF. |
| RNF-016 Privacidad | Sin datos personales restringidos en consulta pública, registros de error ni URL. | Must | Parcial: controles de acceso; sin aviso ni constancia. |
| RNF-017 Seguridad de archivos | Validación de tipo y tamaño, nombres internos no predecibles y almacenamiento no ejecutable. | Must | Parcial: tipo/tamaño declarados; sin descargas/limpieza acreditadas. |
| RNF-018 Usabilidad | Con 5 participantes ajenos al equipo, al menos 4 completan solicitud y consulta de estado sin ayuda directa. | Should | Pendiente de confirmar mediante ensayo. |

**Alcance adicional acordado (D):** RNF-005 (sesión actual de un día; política de inactividad pendiente de confirmar) y RNF-013 (respaldo/restauración) están incluidos expresamente en el MVP, conservando prioridad Should. Su cumplimiento se verifica antes de aceptar la entrega; esta decisión no incorpora automáticamente los demás Should/Could.

El lineamiento de accesibilidad (Resolución N.º 001-2025-PCM/SGTD) es referencia; cumplir esta tabla no equivale a certificación integral de accesibilidad.

### **3.4 Protección de datos**

- Las demostraciones usan datos ficticios. No se incorporan documentos de identidad reales ni fotografías de personas ajenas al equipo sin justificación y tratamiento previamente definidos.
- La aplicación muestra un aviso de privacidad con finalidad, categorías de datos, accesos, conservación y canal de contacto.
- La consulta pública es limitada; documentos y fotografías requieren autenticación y autorización.
- Los datos descargados por el inspector se eliminan de la caché operativa siete días después de que su contexto quede cerrado operativamente y completamente sincronizado (**D**, no plazo legal). Incluye visitas finalizadas y visitas suspendidas cuyo contexto ya fue resuelto por continuación o verificación documental. El cierre operativo se registra sin cambiar artificialmente el estado histórico de la visita. El plazo de retención comienza cuando se cumplen ambas condiciones; abrir, consultar o descargar de nuevo no lo reinicia. La PWA comprueba la limpieza al iniciar, reanudar y durante su uso; si estaba cerrada, la ejecuta en el siguiente inicio. Los borradores, operaciones y fotografías pendientes no se borran automáticamente; tampoco se elimina información compartida que aún necesite un borrador.
- Los datos sintéticos pueden eliminarse únicamente mediante la purga administrativa excepcional descrita a continuación. Esta política no reemplaza reglas archivísticas de una municipalidad real.
- Base normativa: Ley N.º 29733 y D.S. N.º 016-2024-JUS.

**Purga administrativa excepcional (D):** solo una cuenta activa con rol `ADMIN`, autenticada en una herramienta de mantenimiento fuera de la interfaz ordinaria, puede solicitar la purga de expedientes demostrativos expresamente seleccionados y ya `Concluido favorable` o `Concluido desfavorable`. No se purgan borradores ni expedientes en trámite. La operación elimina el agregado completo de cada expediente y sus archivos asociados, incluidas sus versiones e historial dependiente; no elimina cuentas, catálogos ni el registro independiente de mantenimiento.

Cada purga conserva fuera del agregado eliminado un registro inmutable con identificador de operación, actor, motivo, fecha del servidor, identificadores seleccionados y resultado. No copia el contenido personal de los expedientes ni sus documentos. La eliminación de datos, el registro de la operación y su actuación en el historial referida al mantenimiento —sin dependencia del expediente eliminado— se confirman conjuntamente; la limpieza de archivos se registra y puede reintentarse sin repetir la eliminación de datos. No se declara completa mientras queden archivos por limpiar.

La excepción a la inmutabilidad se limita al mecanismo autorizado de mantenimiento; la API ordinaria sigue sin poder actualizar ni borrar versiones presentadas. La purga alcanza los datos y archivos activos del servidor; las cachés de la PWA y los respaldos conservan sus políticas propias, sin borrar automáticamente borradores locales no sincronizados. No es una transición del procedimiento ni concede al administrador permisos de funcionario o inspector.

### **3.5 Reglas de negocio y modelo de datos del procedimiento**

#### **3.5.1 Catálogo de procedimientos y tasas**

| Código interno **D** | Procedimiento **N** | Riesgo | Tasa referencial |
|---|---|---|---:|
| SIG-ITSE-B | ITSE posterior al inicio de actividades | Bajo | S/ 104.70 |
| SIG-ITSE-M | ITSE posterior al inicio de actividades | Medio | S/ 125.30 |

Nombres y montos provienen de la publicación municipal y la ordenanza ratificada. Los códigos SIG-ITSE-B y SIG-ITSE-M son internos, no códigos del TUPA. Los importes se almacenan como parámetros con fecha de incorporación y fuente; una modificación no altera el importe de un expediente ya presentado.

**Discrepancia bajo/medio (D):** el procedimiento solicitado y su importe se conservan al presentar, aunque la clasificación posterior determine el otro nivel admitido. El riesgo clasificado vigente se registra por separado del procedimiento solicitado; la discrepancia queda visible en el expediente y auditada con funcionario, fecha y reporte. No genera cobro adicional, devolución ni bloqueo del flujo. La solicitud y el pago presentados no se reescriben para hacerlos coincidir con la clasificación. Esta regla del prototipo no aplica a alto/muy alto, que exige cierre motivado según sección 3.5.7.

#### **3.5.2 Datos de la cuenta (D)**

**Situación actual:** Actualmente User almacena id, email, name, password (hash), role, createdAt y updatedAt. Documento de identidad, estado activo y constancia de privacidad están pendientes.

- **Campos:** correo único, contraseña, nombre completo, tipo y número de documento, fecha de creación, estado de cuenta, constancia de lectura del aviso de privacidad.
- **Validaciones:** DNI de 8 dígitos; carné de extranjería alfanumérico de hasta 20 caracteres; correo con validación sintáctica; la verificación por enlace es una función Should y requiere el servicio de correo (RF-027).
- La validación de formato no es verificación de identidad estatal.

#### **3.5.3 Datos de la solicitud**

**Situación actual:** Actualmente solo se capturan title y description. Los campos de esta sección siguen pendientes de implementar.

El formulario recoge los campos del Anexo 1 para ITSE posterior y no muestra modalidades fuera de alcance.

| Grupo | Campo | Regla |
|---|---|---|
| Procedimiento | Tipo de ITSE | Fijo: posterior al inicio de actividades. |
| Procedimiento | Supuesto de aplicación **D** | Uno de los tres de la sección 1.2.3. |
| Procedimiento | Función del establecimiento | Una o más: almacén, comercio, educación, encuentro, hospedaje, industrial, oficinas administrativas, salud. |
| Solicitante | Condición | Propietario, representante legal o conductor/administrador. |
| Solicitante | Nombres y apellidos, domicilio, correo, teléfono | Obligatorios. |
| Solicitante | DNI o CE | Un tipo y un número. |
| Establecimiento | Razón social o titular; nombre comercial | Razón social obligatoria; admite "sin nombre comercial". |
| Establecimiento | RUC | 11 dígitos cuando corresponda; sin validación SUNAT. |
| Establecimiento | Dirección; referencia; localidad, distrito, provincia, departamento | Dirección obligatoria; referencia opcional. |
| Establecimiento | Giro o actividades; horario de atención | Texto obligatorio. |
| Establecimiento | Área ocupada total (m²) | Decimal positivo. |
| Establecimiento | Número de pisos; piso(s) donde funciona | Entero positivo; texto estructurado (admite sótano, semisótano y varios niveles). |
| Antecedente **D** | Licencia o certificado anterior | Número y fecha según el supuesto; no es archivo obligatorio. |
| Pago | Número y fecha | Obligatorios para presentar en la simulación. |

Los campos básicos proceden del formulario (**N**); el supuesto de aplicación y el antecedente estructurado son **D**. Aforo, antigüedades y áreas desagregadas se registran en la declaración jurada.

#### **3.5.4 Datos de la declaración jurada**

Contenido del Anexo 4: si requiere licencia; función y actividad; aforo; antigüedad de la edificación y de la actividad; área de terreno, área techada por piso, techada total y ocupada total; declaración de correspondencia con la clasificación del riesgo, de implementación y de cumplimiento de condiciones de seguridad; fecha, firma, nombre y DNI del declarante.

Implementación **D**:

- Ofrecer descarga del formulario oficial de referencia y exigir la carga del PDF suscrito.
- Capturar en campos estructurados aforo, antigüedades y áreas, para búsqueda y contraste.
- No reconocer automáticamente el contenido del PDF; el funcionario revisa la concordancia entre datos capturados y documento.
- La firma manuscrita no se denomina firma digital certificada.

#### **3.5.5 Opciones de la declaración y del checklist**

No deben confundirse:

| Documento | Opciones |
|---|---|
| Declaración del administrado sobre implementación | Sí / No corresponde |
| Declaración del administrado sobre condiciones | Sí cumple / No corresponde |
| Verificación del inspector | Sí cumple / No cumple / No aplica |
| Verificación del levantamiento | Cumple Sí / No |

#### **3.5.6 Documentos y archivos**

**Requisitos iniciales (N):** (1) solicitud de ITSE mediante formulario digital; (2) número y fecha del pago por derecho de trámite; (3) declaración jurada de cumplimiento de condiciones de seguridad en PDF.

La publicación municipal exige indicar número y fecha del pago, no subir el recibo; por ello no se exige archivo de comprobante. Tampoco se exigen al inicio croquis, planos, diagrama unifilar, cuadro de cargas, certificado de puesta a tierra ni plan de seguridad; esto no elimina la verificación en campo de los documentos exigibles en cada ítem del checklist.

**Documentos generados o incorporados:** solicitud presentada, cargo de recepción, información y reporte de riesgo, declaración jurada, observaciones documentales, escritos y documentos de subsanación, actas de diligencia, checklist, panel fotográfico, documentación de levantamiento, informe técnico del inspector, documento de conclusión y certificado demostrativo favorable.

**Restricciones técnicas (D):**

- PDF para documentos, hasta 10 MB por archivo; JPEG o PNG para fotografías, hasta 5 MB por archivo.
- Máximo 20 archivos por presentación de subsanación.
- Validación de extensión, tipo real y tamaño; almacenamiento fuera de rutas de ejecución.
- Descarga autenticada, salvo la consulta pública limitada.
- Cada versión conserva autor, fecha e identificador; no se sobrescriben ni eliminan versiones presentadas desde la interfaz ordinaria.

#### **3.5.7 Clasificación del riesgo**

**Decisión (D):** no se implementa un motor automático de clasificación. El funcionario aplica la matriz oficial con la información del solicitante y la aplicación almacena: función, nivel resultante, fecha, funcionario, referencia al criterio aplicado, documento de información proporcionada por el solicitante y reporte del nivel de riesgo. Estos documentos se incorporan en PDF como actuaciones de clasificación, no como requisitos de admisión.

**Reglas:**

- Sin clasificación registrada no se programa inspección.
- Bajo y medio permiten continuar. Si el riesgo clasificado difiere del procedimiento solicitado, se aplica la regla de la sección 3.5.1: procedimiento e importe conservados, riesgo vigente separado y discrepancia visible/auditada, sin cobro adicional, devolución ni bloqueo. Los documentos que muestren esos datos distinguen `procedimiento solicitado` de `riesgo clasificado`; no presentan como coincidentes valores que difieren.
- Alto o muy alto bloquean la continuación y requieren un cierre motivado demostrativo. Si se determina durante la revisión documental, se aplica la ruta de cierre documental de la sección 3.5.15.
- El inspector confirma o contradice la clasificación durante la visita.
- Una discrepancia hacia alto o muy alto se registra en acta y conduce a conclusión denegatoria, no a una reprogramación.

#### **3.5.8 Revisión y subsanación documental**

Reglas **D**:

- Una observación identifica campo o documento, defecto, corrección solicitada, autor y fecha; todas se comunican agrupadas en un único requerimiento por expediente.
- El administrado responde en el mismo expediente con texto y archivos sustitutorios o complementarios; se conservan original y nueva versión.
- El funcionario revisa la respuesta y acepta o mantiene cada observación original con motivación. No emite un segundo requerimiento ni incorpora una nueva ronda de observaciones; la revisión no renueva el plazo.
- Si tras revisar la respuesta quedan observaciones pendientes, el funcionario registra una conclusión desfavorable motivada y el sistema genera su documento por la ruta de cierre documental (sección 3.5.15). Si todas se aceptan, continúa la revisión para habilitar cuando los requisitos y la clasificación sean conformes.
- Una respuesta tardía se registra y marca; no se elimina ni oculta.
- **Plazo:** dos días hábiles para subsanar defectos de presentación, desde la publicación del requerimiento único en el portal, registrada por el servidor; se cuenta desde el día hábil siguiente y se conserva el vencimiento (sección 3.5.16). Se asocia al régimen de subsanación documental de la LPAG (observaciones en un solo acto y por única vez; subsanación por medios electrónicos), no al artículo 23 del reglamento ITSE.

Si vence el plazo sin subsanación: el sistema genera alerta, el funcionario registra la decisión motivada que corresponda, no se transforma automáticamente en resultado técnico desfavorable y el expediente no se borra. Si el funcionario decide concluir desfavorablemente, se aplica la ruta de cierre documental de la sección 3.5.15; el vencimiento no produce cierre automático.

**La subsanación documental es independiente del levantamiento de observaciones físicas** (sección 3.5.12): distintos orígenes, plazos, actores y estados.

#### **3.5.9 Pago simulado**

**Situación actual:** Actualmente se registra un recibo y un importe libre con un pago único por solicitud; no hay estados de pago ni anulación. Las reglas siguientes son el objetivo pendiente; su simplificación permanente está pendiente de confirmar.

El pago se registra **antes** de presentar la solicitud.

- **Campos (D):** procedimiento, importe, número de operación demostrativa, fecha, estado, usuario que ejecutó la simulación.
- **Estados:** Pendiente, Registrado, Anulado.
- **Aviso obligatorio en la interfaz:** "Pago simulado para demostración académica. No se realizará ningún cobro."
- Solo el administrado propietario registra o anula el pago de su expediente en `Borrador`. La anulación exige motivo e `Idempotency-Key`, cambia `Registrado → Anulado` mediante la transición autorizada y escribe historial en la misma transacción. Funcionario, inspector y administrador no adquieren ese permiso.
- Solo puede existir un pago `Registrado` vigente por expediente. Tras anular, se conserva el registro y el siguiente pago se inserta como una nueva simulación; un `Anulado` no se reactiva. El importe lo determina el servidor a partir del procedimiento y su tasa, no el cliente.
- Si existe un pago `Registrado`, cambiar el procedimiento del borrador se rechaza: antes se anula ese pago, después se cambia el procedimiento y se registra un nuevo pago. Al presentar se comprueba que el pago vigente corresponde al procedimiento solicitado y se congela el importe aplicado en la versión presentada.
- Después de presentar no se registra ni se anula el pago. Un recurso ajeno o inexistente devuelve `404`; un rol no autorizado, `403`; un estado incompatible, pago vigente duplicado o cambio de procedimiento con pago registrado, `409`. El reintento con la misma clave y petición devuelve la respuesta original; misma clave con contenido distinto, `422`.

#### **3.5.10 Programación y suspensión**

**Programación.** Se registra expediente, inspector, fecha, hora de inicio y fin previstas, dirección, tipo de diligencia y estado. No se permiten solapamientos del mismo inspector; asignación y cambios quedan auditados.

**Tipos de diligencia:** inicial; continuación de diligencia suspendida; verificación de levantamiento de observaciones.

**Inspección lógica y visitas (D):** el expediente reúne una única inspección técnica lógica con una o más visitas físicas. La inicial, sus continuaciones y las verificaciones comparten el checklist, el catálogo y la identidad de las observaciones; no duplican la inspección. Cada continuación es una nueva visita vinculada a la visita suspendida, su acta y, si corresponde, el levantamiento que se verifica. La visita anterior conserva su registro; no se sobrescriben fechas, respuestas ni autorías históricas. La continuación incorpora lo pendiente y sus evidencias al mismo conjunto técnico.

**Responsable técnico (D):** el inspector de la visita inicial asume la responsabilidad técnica. El funcionario puede reasignarla expresamente a otro inspector activo con motivo e historial, preservando las autorías anteriores. El inspector de la visita operativa debe ser el responsable vigente; la programación o reasignación debe comprobar esa coherencia. La reasignación no autoriza al inspector anterior a seguir modificando el conjunto técnico.

**Suspensión (N, art. 12 del reglamento):**

| Causa | Regla |
|---|---|
| Ausencia del administrado o persona designada | Nueva fecha dentro de los dos días hábiles siguientes; si se repite la ausencia, finalización y denegación. |
| Complejidad del establecimiento | Continuación dentro de los dos días hábiles siguientes. |
| Impedimento de acceso o verificación | Reprogramación por única vez dentro de los dos días hábiles; si persiste, posible finalización fundamentada. |
| Caso fortuito o fuerza mayor | Reprogramación al terminar el hecho; registro de comunicación de reanudación. |

Toda suspensión genera acta. El funcionario registra expresamente el plazo afectado, el fundamento y la suspensión o reanudación de su cómputo según el supuesto (sección 3.5.16). Registrar una suspensión de diligencia o reprogramar una visita no cambia por sí solo el vencimiento del procedimiento. "Reprogramar" no habilita reiniciar indefinidamente el plazo.

#### **3.5.11 Checklist completo del inspector**

**Fuente del catálogo previsto.** El catálogo reproduce funcionalmente el Anexo 6a (CENEPRED, ofrecido por la Municipalidad Distrital de San Miguel) y se identifica como **CAT-ITSE-POST-2018**. Contiene **67 verificaciones** en cuatro bloques: incendio (26), colapso (12), otros riesgos (13) y observaciones no relevantes en términos de riesgo (16). Son las filas del formulario, no 67 obligaciones aplicables a todo local. Aplican las limitaciones de la sección 1.3.

**Comprobaciones previas** (antes del catálogo):

- Confirmar que la clasificación corresponde al establecimiento.
- Confirmar que el establecimiento está implementado para la actividad: no está en construcción y dispone de servicios esenciales, mobiliario básico y equipos instalados o ubicados para su uso.

**Opciones de respuesta:** Sí cumple / No cumple / No aplica.

##### **a) Riesgo de incendio (K01–K26)**

| ID | Grupo | Verificación |
|---|---|---|
| K01 | Evacuación | Medios de evacuación con ancho mínimo 1.20 m y/o evacuación segura. |
| K02 | Evacuación | Ambiente con aforo > 100 personas: puerta de salida con barra antipánico. |
| K03 | Evacuación | Sin materiales combustibles o inflamables bajo escaleras de evacuación. |
| K04 | Eléctrico | Gabinete eléctrico metálico o de resina termoplástica, conservado. |
| K05 | Eléctrico | Termomagnéticos acordes a la capacidad de los conductores; sin llaves de cuchilla. |
| K06 | Eléctrico | Un termomagnético por circuito; interruptor general interior o adyacente. |
| K07 | Eléctrico | Sin conductores tipo mellizo como instalación permanente de alumbrado o tomacorrientes. |
| K08 | Eléctrico | Sin circuitos de tomacorrientes sobrecargados por extensiones o adaptadores. |
| K09 | Plan | Establecimientos de 2 o más pisos: plan de seguridad frente a incendio y otros riesgos. |
| K10 | GLP | Cilindros tipo 10 con manguera flexible: limpia, sin rajaduras ni grasa, firmemente sujeta. |
| K11 | GLP | Cilindros tipo 45: tuberías de cobre o fierro galvanizado. |
| K12 | GLP | Cilindros a > 0.30 m de interruptores y > 0.50 m de tomacorrientes, ventilados y alejados de calor. |
| K13 | GLP | Sin cilindros en semisótanos, sótanos, cajas de escalera, pasillos o pasadizos comunes ni vía pública. |
| K14 | Comercio | Detección y alarma centralizada operativa; excepciones del formulario: restaurantes < 300 m², mercados sin techo común, tiendas < 250 m². |
| K15 | Comercio | Extintores de acetato de potasio si hay freidoras, humos y vapores de grasa. |
| K16 | Encuentro | Detección y alarma centralizada operativa; exceptúa locales < 100 m² techados. |
| K17 | Encuentro | Extintores tipo K si hay freidoras, humos y vapores de grasa. |
| K18 | Oficinas | Detección y alarma centralizada; exceptúa locales < 280 m² por piso y hasta 4 pisos, con pulsador. |
| K19 | Oficinas | Edificaciones con conformidad de obra ≤ 5 años: detección, alarma, red húmeda, gabinetes y rociadores en oficinas de más de 5 niveles. |
| K20 | Oficinas | Mismo bloque que K19: dos escaleras de evacuación a prueba de fuego y humo, operativas. |
| K21 | Oficinas | Alternativa a K20: una escalera a prueba de fuego y humo si, conjuntamente, altura ≤ 30 m, planta ≤ 650 m², ≤ 100 evacuantes por planta, detección y alarma y demás condiciones del supuesto. |
| K22 | Salud | Detección y alarma centralizada operativa cuando existe; obligatoria en centros de 2 o más pisos. |
| K23 | Salud | Escalera presurizada operativa y con constancia de mantenimiento cuando existe. |
| K24 | Salud | Sistema de agua contra incendios operativo y con constancia cuando existe; obligatorio en centros de 3 o más niveles. |
| K25 | Hospedaje | Extintores tipo K si hay freidoras, humos y vapores de grasa. |
| K26 | Hospedaje | Detección y alarma centralizada operativa. |

**Reglas de aplicabilidad (D):**

- K10–K13 requieren instalaciones GLP correspondientes.
- Los ítems por función (K14–K26) se habilitan según las funciones registradas; con varias funciones se habilitan todos sus ítems.
- K20 y K21 no se exigen como alternativas simultáneamente obligatorias. El inspector selecciona expresamente la ruta usada, registra la justificación y referencia al formulario versionado y responde la alternativa no utilizada como No aplica con su motivo. Si el bloque no corresponde al establecimiento, justifica la no aplicación de ambos. La elegibilidad de la alternativa se verifica manualmente frente al formulario de referencia; el resumen del catálogo no constituye una regla automática completa ni permite inferir condiciones omitidas.
- El inspector registra la justificación de toda excepción o alternativa; el software no resuelve excepciones con decisiones ocultas.

##### **b) Riesgo de colapso (K27–K38)**

Cada grupo se aplica al sistema constructivo existente.

| ID | Grupo | Verificación |
|---|---|---|
| K27 | Cimentación | No expuesta ni inestable por filtraciones, erosión, socavamiento u otras causas. |
| K28 | Concreto | Sin fisuras, grietas, rajaduras, deflexiones, pandeos, inclinaciones, acero expuesto o deterioro por humedad que comprometan la estructura. |
| K29 | Concreto | Losas y vigas sin daños por sobrecargas de tanques, equipos, antenas, publicidad u otros elementos. |
| K30 | Concreto | Muros de contención sin daños, deformaciones, inclinaciones, acero expuesto o deterioro por humedad. |
| K31 | Albañilería | Con elementos de confinamiento, amarre o arriostramiento correspondientes. |
| K32 | Albañilería | Muros sin humedad, rajaduras, grietas, inclinaciones u otros daños. |
| K33 | Adobe | Sin daños ni humedad; no usado como contención; sin construcciones de concreto o albañilería encima; protegido de lluvia donde corresponda. |
| K34 | Madera o bambú | Sin rajaduras, deformaciones, apolillamiento ni deterioro por humedad. |
| K35 | Madera o bambú | Elementos sin daños por cargas mayores a su capacidad. |
| K36 | Madera o bambú | Alejada o aislada de fuentes de calor, o protegida con material incombustible o tratamiento correspondiente. |
| K37 | Acero | Sin deformaciones excesivas; apoyos, uniones, pernos, soldaduras y anclajes seguros. |
| K38 | Acero | Sin óxido o corrosión y protegido frente a ellos. |

##### **c) Otros riesgos (K39–K51)**

| ID | Grupo | Verificación |
|---|---|---|
| K39 | Puesta a tierra | Tablero metálico conectado a tierra. |
| K40 | Eléctrico | Tablero con placa de protección o mandil. |
| K41 | Eléctrico | Circuitos con protección diferencial. |
| K42 | Puesta a tierra | Carcasas de motores, grupos electrógenos y aire acondicionado conectadas a tierra. |
| K43 | Puesta a tierra | Estructuras metálicas accesibles con equipamiento eléctrico conectadas a tierra. |
| K44 | Estructural | Rampas con pendiente ≤ 12%, piso antideslizante y barandas, según el ítem del formulario. |
| K45 | Estructural | Aberturas y zonas elevadas a más de 1 m con protección al vacío de al menos 1 m, según el ítem del formulario. |
| K46 | Estructural | Soportes de antenas y paneles estables, anclados y sin deterioro que comprometa su estabilidad. |
| K47 | Estructural | Racks fijos, estables y conservados. |
| K48 | Estructural | Soportes de aire acondicionado y otros equipos firmes, conservados y con equipos asegurados. |
| K49 | Otros | Extracción de monóxido de carbono en sótanos operativa y con constancia cuando existe. |
| K50 | Otros | Juegos infantiles estables, seguros, bien instalados y conservados. |
| K51 | Otros | Vidrios expuestos a impacto o rotura de seguridad, o con lámina o sistema de protección correspondiente. |

##### **d) Observaciones menores no relevantes en términos de riesgo (K52–K67)**

Este bloque se conserva separado, como en el formulario, e incluye los campos de verificación del levantamiento (sección 3.5.12).

| ID | Grupo | Verificación |
|---|---|---|
| K52 | Evacuación | Medios de evacuación libres de obstáculos. |
| K53 | Evacuación | Señalización de salida, zona segura, riesgo eléctrico, extintores y demás aplicable. |
| K54 | Evacuación | Luces de emergencia operativas. |
| K55 | Evacuación | Puertas de evacuación abren en sentido de salida o permanecen abiertas durante la atención sin impedir la circulación. |
| K56 | Extintores | Operativos y suficientes para el riesgo. |
| K57 | Extintores | Con tarjeta actualizada, numerados, accesibles, a altura ≤ 1.50 m y con constancia de operatividad y mantenimiento. |
| K58 | Extintores | A la intemperie, protegidos con gabinete o cobertor. |
| K59 | Tableros | Espacios no usados cerrados con tapas. |
| K60 | Tableros | Certificado anual de medición de puesta a tierra suscrito por profesional colegiado y habilitado, con valor ≤ 25 ohmios según el formulario. |
| K61 | Tableros | Equipos que lo requieren con enchufes con espiga de tierra y tomacorrientes conectados a tierra. |
| K62 | Tableros | Conductores protegidos por tubos o canaletas de PVC. |
| K63 | Tableros | Cajas de paso con tapa. |
| K64 | Tableros | Tableros identificados. |
| K65 | Tableros | Directorio de circuitos visible y claro. |
| K66 | Tableros | Espacio libre de al menos 1 m frente a tableros. |
| K67 | Tableros | Iluminación general y de emergencia en la ubicación de tableros. |

##### **e) Datos por respuesta y validación obligatoria (D)**

Cada respuesta conserva: ítem y versión del catálogo; Sí cumple / No cumple / No aplica; observación; motivo de no aplicación; fotografías vinculadas; documento técnico consultado, si existe; inspector; fecha de captura; fecha de sincronización. También conserva la imposibilidad justificada de aportar evidencia fotográfica cuando corresponda.

Reglas de validación:

- "Sin responder" es un estado técnico, no una respuesta.
- Todo **"No cumple"** exige descripción.
- Todo **"No aplica"** exige justificación.
- La emisión del informe ordinario exige los 67 ítems resueltos explícitamente: Sí cumple, No cumple o No aplica con justificación. Los filtros de aplicabilidad no omiten respuestas ni convierten automáticamente un ítem en resuelto; el inspector confirma y justifica cada No aplica. Se preservan las continuaciones y los cierres anticipados que no exigen completar artificialmente el checklist.
- No se exige fotografía por cada respuesta positiva.
- Se exige **panel fotográfico y evidencia de los incumplimientos**, salvo imposibilidad justificada. La imposibilidad se registra con motivo, inspector y fecha, vinculada al incumplimiento o al panel afectado; el informe/panel muestra esa constancia y las fotografías disponibles. No se fabrican fotografías ni se cambia la respuesta técnica por falta de imagen.

##### **f) Resultado**

No se calcula aprobación por porcentaje. El inspector registra: si cumple las condiciones de seguridad relevantes (Sí/No); existencia de observaciones del bloque K52–K67; conclusión; conformidad o disconformidad expresada por el administrado; y constancia de entrega o imposibilidad de obtener cargo.

#### **3.5.12 Levantamiento de observaciones y visita de verificación**

**Procedencia (N).** Aplica a observaciones subsanables sobre condiciones no relevantes en términos de riesgo (bloque K52–K67). El inspector suspende la diligencia, consigna las observaciones en acta y concede hasta **tres días hábiles**. Si no se levantan en plazo, corresponde conclusión denegatoria. Este plazo no se aplica a incumplimientos de otra naturaleza.

**Inicio del plazo (D):** el acto inicial es la recepción del acta de observaciones en el servidor y su disponibilidad autenticada para el administrado en el portal. Los días concedidos se cuentan desde el día hábil siguiente y vencen al terminar el último día hábil (sección 3.5.16). La captura offline del acta se conserva como evidencia, pero no inicia por sí sola un plazo exigible al administrado.

**Presentación (administrado):** escrito explicativo, observaciones atendidas, fotografías y documentos técnicos de sustento cuando correspondan. Expediente y observaciones conservan su identidad.

**Recepción tardía (D):** mientras el expediente no esté concluido, se conserva el envío con marca de tardío y fecha del servidor, sin pasar a `Levantamiento presentado` ni habilitar verificación. El expediente permanece `Pendiente de levantamiento` hasta la decisión motivada del funcionario. La recepción no concede otra oportunidad ni reinicia el plazo. Si no se levantaron las observaciones en plazo, corresponde conclusión denegatoria conforme a la regla de procedencia; el sistema no inventa un resultado técnico ni registra el cierre automáticamente. Tras un estado terminal solo se permite consulta y descarga.

**Verificación (inspector):** el responsable técnico vigente elige verificación documental o visita presencial y el expediente pasa a `En verificación`. Ambos medios están previstos, sin implementación actual; la visita no es obligatoria en todos los casos, porque el formulario también contempla evaluar documentación sustentatoria.

- **Documental:** se resuelven las observaciones y se registra la evaluación de sus sustentos, sin crear ni reabrir una visita física. La verificación documental completa permite emitir el informe con las evidencias y actas de las visitas anteriores, aunque la visita que originó el levantamiento haya quedado suspendida por esas observaciones.
- **Presencial:** el funcionario programa una visita de verificación con inspector activo, sin solapamientos y vinculada a la inspección y al levantamiento. Programar, iniciar o suspender esa visita no saca al expediente de `En verificación`. Si procede continuar, se crea otra visita vinculada que conserva ese contexto y las reglas de la causa de suspensión. Se completa la evaluación al finalizar y sincronizar las visitas requeridas y resolver todas las observaciones originales.
- Se preservan las respuestas originales y se registran por separado los resultados del levantamiento; no se sustituye un `No cumple` original por una respuesta favorable sin conservar su antecedente. La suspensión, continuación o reasignación no concede otra oportunidad de levantamiento ni reinicia el plazo.

Por observación se registra: cumplimiento (Sí/No), sustento, fecha, medio de verificación y evidencia.

No se abre una sucesión ilimitada de oportunidades: concluida la verificación se registra el resultado correspondiente.

#### **3.5.13 Trabajo sin conexión (PWA)**

Requisitos **D**:

1. Solo se trabaja sin conexión con visitas descargadas previamente (datos mínimos, declaración y checklist).
2. La PWA guarda respuestas, comentarios y fotografías, y muestra confirmación local en cada guardado.
3. El cierre de la aplicación no elimina borradores.
4. Se admite sincronización manual y reintento al recuperar conectividad.
5. Cada operación lleva un identificador para evitar duplicados.
6. Se conservan por separado la fecha local y la recepción del servidor.
7. No se comunica finalización administrativa antes de la recepción completa.
8. Una visita cancelada o reasignada produce un conflicto visible al sincronizar. Con sesión activa y rol de inspector, una asignación histórica registrada permite únicamente entregar operaciones y fotografías en cuarentena, sin aplicarlas ni recuperar lectura, descarga o modificación ordinarias de la visita. La respuesta no revela datos actuales de otros inspectores. Sin asignación actual ni histórica, el recurso se trata como ajeno (`404`); los estados terminales del expediente siguen impidiendo cambios.
9. No se aplica "última escritura gana" de forma silenciosa; el funcionario resuelve los conflictos con motivo y conservando ambas versiones. Solo puede aceptar una versión enviada si la visita y la asignación de origen siguen vigentes y la revisión actual coincide con la que examinó. En visitas canceladas o reasignadas, el envío permanece como evidencia sin aplicarse; devolverlo no restituye permisos al inspector anterior.
10. Resolver conservando la versión vigente descarta la operación entrante de forma trazable, sin fingir que fue aplicada. Devolver al inspector deja una corrección pendiente. Tras una resolución, la finalización requiere un nuevo manifiesto coherente con la asignación, revisiones, operaciones y fotografías vigentes; los anteriores se conservan. No se genera informe mientras existan conflictos abiertos o correcciones de sincronización pendientes.

**Estados de sincronización:** Guardado local, Pendiente, Sincronizando, Sincronizado, Error, Conflicto.

Las fotografías pendientes se contabilizan. No se emite informe definitivo ni certificado mientras falte sincronización obligatoria.

#### **3.5.14 Estados del sistema**

**Situación actual:** Los estados actuales son PENDIENTE, EN_REVISION, OBSERVADO, APROBADO y RECHAZADO; ItseService actualiza directamente status. La tabla siguiente es el flujo previsto, aún sin motor de transición.

**Estados del expediente (D):**

| Estado | Entrada | Salida |
|---|---|---|
| Borrador | Creación | Presentación |
| Presentado | Envío y cargo | Revisión |
| En revisión documental | Funcionario inicia o retoma revisión | Requerimiento único, habilitación o cierre documental motivado |
| Pendiente de subsanación documental | Requerimiento | Respuesta o decisión motivada |
| Subsanación presentada | Administrado responde | Revisión |
| Habilitado para programación | Requisitos y clasificación conformes | Programación |
| Inspección programada | Inspector y fecha | Diligencia |
| En evaluación técnica | Inicio de visita inicial o continuación | Finalización/sincronización de visitas y emisión del informe; suspensión, levantamiento o cierre anticipado mediante acta |
| Diligencia suspendida | Acta | Reprogramación/continuación o cierre motivado según la causa y el resultado |
| Pendiente de levantamiento | Acta de observaciones | Presentación o conclusión |
| Levantamiento presentado | Administrado responde | Verificación |
| En verificación | Responsable vigente elige medio | Verificación documental completa o visitas requeridas finalizadas/sincronizadas, y después informe final |
| Pendiente de cierre | Informe y evidencias completos | Corrección técnica versionada sin salir del estado; conclusión favorable o desfavorable solo sin correcciones pendientes |
| Concluido favorable | Cierre | Solo consulta y descarga |
| Concluido desfavorable | Cierre motivado | Solo consulta y descarga |

El cierre documental por clasificación alto/muy alto, por observaciones pendientes tras revisar la respuesta o por decisión motivada tras vencer el plazo sin subsanación utiliza los soportes de la revisión, sin acta de inspección ni informe técnico (sección 3.5.15). Una conclusión anticipada de campo por riesgo fuera de alcance o por falta de implementación puede llegar al cierre mediante acta, sin completar artificialmente el checklist.

La consulta y descarga son las únicas actuaciones ordinarias tras concluir. La purga excepcional de la sección 3.4 pertenece al mantenimiento y no agrega un estado ni una transición de reapertura o eliminación.

**Estados independientes.** El estado del expediente no se mezcla con los siguientes:

| Dimensión | Valores |
|---|---|
| Pago | Pendiente, Registrado, Anulado |
| Visita | Programada, Iniciada, Suspendida, Finalizada, Cancelada |
| Resultado técnico | Pendiente, Favorable, Desfavorable |
| Sincronización | Guardado local, Pendiente, Sincronizando, Sincronizado, Error, Conflicto |
| Correo (Should) | Pendiente, Enviado, Error |

#### **3.5.15 Documentos de cierre y certificado**

En el flujo técnico ordinario, los documentos se emiten en esta secuencia:

| Orden | Documento | Responsable | Precondición |
|---|---|---|---|
| 1 | **Informe técnico** (con panel fotográfico) | Sistema, a partir del registro del inspector responsable vigente | Evaluación completa: visitas requeridas finalizadas y sincronizadas, o verificación documental completa; datos y evidencias consolidados. |
| 2 | **Documento de conclusión** | Sistema, tras la decisión del funcionario | Integridad comprobada y decisión demostrativa registrada. |
| 3 | **Certificado demostrativo** | Sistema | Solo si la conclusión es favorable y existe el informe técnico requerido. |

**Flujo ordinario:** (1) el inspector finaliza y sincroniza las visitas requeridas, o completa la verificación documental; el expediente permanece en `En evaluación técnica` o `En verificación`; (2) el sistema conserva una versión técnica consolidada e inmutable, genera informe y panel y pasa a `Pendiente de cierre` en la misma operación transaccional e idempotente; (3) el funcionario comprueba integridad, confirma que no hay correcciones pendientes y registra la conclusión; (4) el sistema genera el documento de conclusión; (5) si es favorable, genera el certificado; (6) registra el evento y, si se implementa RF-027 (Should), envía el aviso por correo. Un fallo al generar el informe no concluye el expediente ni revierte la finalización de una visita ya confirmada; la emisión puede reintentarse sin duplicar versiones.

**Cierre documental desfavorable:** durante la revisión documental, el funcionario registra una decisión motivada si la clasificación resulta alto/muy alto, si quedan observaciones pendientes tras revisar la respuesta o si decide concluir tras vencer el plazo sin subsanación. El documento de conclusión referencia los soportes conservados de la ruta: clasificación y reporte de riesgo; o requerimiento único, observaciones y sus respuestas y versiones, si existen, con el vencimiento registrado cuando corresponda. No exige acta de inspección ni informe técnico y nunca genera certificado. La decisión, el cambio de estado, su historial y el registro del documento de conclusión se confirman en la misma operación transaccional e idempotente.

**Cierre anticipado de campo:** si durante la inspección el riesgo resulta alto/muy alto, el establecimiento no está implementado o una causa de suspensión exige concluir, se registra un acta y una decisión motivada. En estos casos puede generarse el documento de conclusión referenciado al acta sin fabricar un informe técnico ni completar artificialmente el checklist. Nunca se emite certificado en estos casos. La ruta y el motivo quedan en el historial.

**Corrección técnica previa al cierre (D):** el funcionario no puede convertir un resultado técnico desfavorable en favorable. Ante un error, registra una solicitud motivada que identifica el informe y los datos técnicos afectados. El expediente permanece en `Pendiente de cierre`; mientras haya solicitudes sin atender, no puede concluirse.

El responsable técnico vigente atiende mediante una nueva versión de los datos técnicos afectados y del informe, con motivo, autor, fecha, hash y referencias a la versión anterior y a la solicitud. Las respuestas, resultados y evidencias publicados se conservan; la corrección no consiste únicamente en sustituir el PDF. La nueva versión técnica, el nuevo informe y la atención se confirman conjuntamente con historial e idempotencia. El informe anterior permanece consultable y la conclusión debe referenciar la versión vigente.

La corrección no crea otra visita ni reabre una finalizada, no concede otra oportunidad de levantamiento y no reinicia plazos. Si cambia el responsable, se requiere la reasignación expresa de la sección 3.5.10, con autoría anterior conservada. No se permiten solicitudes ni atenciones de corrección después de `Concluido favorable` o `Concluido desfavorable`.

**Certificado — campos del Anexo 13 (N):** número; municipalidad referencial; nombre comercial; dirección; distrito, provincia y departamento; solicitante; capacidad máxima en números y letras; giro; expediente; referencia del documento de conclusión; lugar; fecha de expedición; fecha de caducidad; fecha de referencia para solicitar renovación; advertencia de que el certificado no autoriza el funcionamiento.

**Campos adicionales (D):** código aleatorio único (Must); identificador de versión; aviso académico; QR (Should, con RF-025).

**Encabezado y marca de agua obligatorios en todas las páginas:**

> DEMOSTRACIÓN ACADÉMICA — SIN VALIDEZ ADMINISTRATIVA.

No se incorporan firmas de autoridades reales ni sello municipal auténtico. La vigencia de referencia es de dos años desde la expedición; la fecha de solicitud de renovación se calcula 30 días hábiles antes de la caducidad, según el formato. No se implementa la renovación.

**Cálculo de fechas (D):** la expedición utiliza la fecha del servidor convertida a `America/Lima`. La caducidad se obtiene sumando dos años calendario a esa fecha; no se desplaza si cae en fin de semana, feriado o día no laborable. Para una expedición el 29 de febrero cuyo aniversario no existe en el año de caducidad, se usa el 28 de febrero. La referencia de renovación se calcula contando 30 días hábiles hacia atrás desde el día anterior a la caducidad, excluyendo fines de semana y los feriados/días no laborables registrados conforme a 3.5.16. Las tres fechas quedan conservadas en el certificado emitido; un reintento o cambio posterior del calendario no las recalcula.

**Verificador público (Should).** Muestra: documento encontrado o no encontrado, número, nombre comercial, dirección del establecimiento, riesgo, expedición y caducidad, y condición demostrativa. **No** muestra: DNI o CE, correo, teléfono, domicilio personal, declaración jurada, fotografías ni expediente íntegro. El código y el QR no se describen como firma digital ni prueba de validez jurídica.

#### **3.5.16 Plazos y calendario**

**Plazo de referencia (N).** El procedimiento estandarizado de ITSE posterior para riesgo bajo y medio establece **nueve días hábiles** con evaluación previa y silencio administrativo positivo. Está previsto para ambos procedimientos, sin implementación actual. Se incorpora la fe de erratas del D.S. N.º 043-2021-PCM, publicada el 24/03/2021, que rectifica de siete a nueve días hábiles los procedimientos de riesgo bajo y medio. Fuente primaria: https://busquedas.elperuano.pe/dispositivo/NL/1937569-1. No confundir con los siete días de riesgo alto/muy alto ni con el otorgamiento de licencia.

**Calendario (D):**

- Zona horaria America/Lima.
- Días hábiles: lunes a viernes, excluyendo feriados y días no laborables registrados.
- Los plazos en días se cuentan desde el día hábil siguiente al acto que los inicia y vencen al terminar el último día hábil en `America/Lima`. Se compara la recepción del servidor con ese límite; el reloj local no determina puntualidad.

**Actos iniciales (D):**

| Plazo | Acto inicial registrado por el servidor |
|---|---|
| General: nueve días hábiles, para ambos procedimientos | Presentación confirmada de la solicitud. |
| Subsanación documental: dos días hábiles | Publicación del requerimiento único, disponible para el administrado en el portal. |
| Levantamiento: hasta tres días hábiles según lo concedido en acta | Acta recibida en el servidor y disponible para el administrado en el portal. |

La demora de sincronización no se sustituye por la hora declarada por el dispositivo. Cada inicio se registra una sola vez; reintentos, nuevas versiones o consultas no reinician plazos. Una recepción tardía se conserva según las reglas de su flujo, sin reabrirlo automáticamente.

**Suspensión y reanudación del cómputo (D):**

- El funcionario registra una decisión explícita con el plazo afectado, fundamento, actuación de soporte y fecha del servidor. No existe una pausa automática por observar documentos, registrar observaciones físicas o reprogramar una visita.
- La suspensión conserva los días hábiles ya consumidos y el saldo; la reanudación utiliza ese saldo y no concede de nuevo la duración inicial. Solo se consumen los días hábiles de cómputo completos anteriores a la fecha de suspensión; el día en que se registra la suspensión no se consume. El saldo se cuenta desde el día hábil siguiente a la reanudación, excluyendo los períodos de suspensión. Cada nuevo ciclo conserva el consumo acumulado de los anteriores. Se conservan las fechas y el fundamento de ambas actuaciones, el vencimiento anterior y el recalculado en el historial.
- Una suspensión no borra un vencimiento ya producido ni permite reinicios indefinidos. El cambio afecta únicamente al plazo identificado; no modifica silenciosamente los otros plazos.
- Estas decisiones son actuaciones del prototipo académico; el calendario no interpreta automáticamente las causas normativas ni declara efectos administrativos reales.

**Vencimiento y silencio.** El sistema genera alertas, muestra el vencimiento y registra la situación. No produce automáticamente respuestas positivas de checklist, informe favorable ficticio ni certificado que afirme una verificación inexistente. El silencio positivo es una consecuencia jurídica y no equivale a que el software haya comprobado las condiciones; el reglamento mantiene obligaciones de verificación posteriores.

#### **3.5.17 Notificaciones y seguimiento (Should)**

En el MVP, el seguimiento se garantiza con el historial del expediente en el portal (RF-026). El correo (RF-027) complementa ese seguimiento.

**Eventos notificables:** presentación; observación documental; recepción de subsanación; programación y reprogramación; suspensión; observaciones de inspección; recepción del levantamiento; conclusión; disponibilidad del certificado.

Decisiones **D**:

- El aviso contiene número de expediente, evento, fecha y enlace autenticado; no adjunta datos personales ni fotografías.
- El certificado se descarga desde el portal.
- Los correos fallidos se reintentan tres veces; un error de correo no revierte actuaciones ni duplica documentos, y el historial permanece disponible.
- Son comunicaciones informativas del prototipo, no una casilla electrónica administrativa regulada.

### **3.6 Trazabilidad mínima**

| Materia | RF | Fuente o decisión |
|---|---|---|
| Solicitud y declaración | RF-004, 005, 007 | Anexos 1 y 4; publicación municipal. |
| Requisitos y tasas | RF-006, 008 | Publicación municipal y ordenanza. |
| Clasificación | RF-010 | Matriz y reporte; registro manual asistido **D**. |
| Checklist | RF-014 | Anexo 6a. |
| Fotografías | RF-015, 022 | Panel fotográfico. |
| Suspensión | RF-018 | Artículo 12. |
| Observaciones y levantamiento | RF-019–021 | Artículo 23 y Anexo 6a. |
| Informe, conclusión y certificado | RF-022–024 | Anexo 13; documentos demostrativos **D**. |
| Offline | RF-013, 016, 017 | **D**. |
| Verificación pública y QR | RF-025 | **D**. |
| Datos personales | RNF-016 y sección 3.4 | Ley y reglamento; controles **D**. |

---

## **4. REQUISITOS DE INTERFACES EXTERNAS**

### **4.1 Interfaz de Usuario (UI)**

**Situación actual:** Actualmente existen Login, Dashboard y los modales CreateRequestModal, PaymentModal, ReviewModal y AssignInspectorModal. El registro existe solo por API. Las demás vistas de esta sección están pendientes.

Aplicación web responsiva con lenguaje claro y accesibilidad (RNF-010, RNF-012). La PWA del inspector es mobile-first, con botones grandes y flujo lineal para uso en campo.

- **Portal del administrado:** acceso, solicitudes y formulario, declaración y documentos, pago simulado, observaciones y subsanación, agenda, levantamiento, historial, documentos de cierre.
- **Panel del funcionario:** bandeja por estado, revisión, clasificación, pago, asignación, agenda, resultados y cierre. La consulta avanzada de auditoría es Should y corresponde al administrador autorizado.
- **PWA del inspector:** visitas, descarga, identificación del local, comprobaciones previas, checklist, cámara y evidencias, actas, levantamiento, cola de sincronización.

### **4.2 Interfaz de Hardware e Infraestructura**

La PWA requiere Google Chrome en un dispositivo Android 10 o superior con cámara (RNF-011); otros navegadores móviles e iOS quedan fuera del MVP. No se exige GPS. Funcionarios y administrados acceden con navegador actualizado, sin hardware especializado. El entorno demostrativo se despliega con HTTPS (RNF-002).

### **4.3 Interfaz de Software e Integraciones**

- API REST con JSON.
- Base de datos transaccional.
- Almacenamiento privado de archivos.
- Generación de PDF en servidor.
- Persistencia local para operación sin conexión.
- Proveedor SMTP o API de correo (Should, RF-027).
- Verificador público de solo lectura (Should, RF-025).

No se implementan contratos de una futura pasarela de pago: basta el registro interno del pago simulado. No se prevén integraciones con sistemas estatales.
