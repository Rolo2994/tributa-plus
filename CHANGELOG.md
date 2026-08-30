# Tributa+ — Registro de cambios

## Resumen del proyecto
PWA (React + Vite + Tailwind) para gestión tributaria de contadores
independientes. Base de datos: Google Sheets vía Apps Script
(apps-script/Code.gs). Deploy: GitHub → Vercel.

## Funcionalidades completas
- Sincronización de RUCs, Tributos y Notas desde Google Sheets
- Notas por RUC con recordatorios (tributo o tarea libre), recurrencia
  (diaria/semanal con días específicos/mensual/anual), guardado
  automático en la nube (con protección contra doble-codificación JSON)
- Notificaciones push reales (vía Service Worker, compatibles con Android)
- Cronograma de vencimientos por dígito de RUC (SIRE/DJ Mensual/DJ Anual)
  + AFPnet (5to día hábil), con cálculo de días hábiles/feriados Perú
- Dashboard tributario: deuda pendiente desde hoja "Tax Status", cálculo
  de interés (SUNAT 0.9% mensual redondeado, AFP 1.4% sin redondear,
  prorateado diario desde el día siguiente al vencimiento), treemap de
  composición de deuda, KPIs, exportar CSV / WhatsApp texto / WhatsApp
  imagen (html2canvas)
- Buzón PDF, Validez CP, Detracciones, SIRE (Buzón PDF ya ejecuta
  acciones reales desde el celular, según últimos cambios del usuario)
- Filtros de Grupo y Tipo de vencimiento compartidos vía panel lateral
  (3 rayas) — accesibles desde cualquier pantalla
- Selectores propios (CustomSelect, CustomDatePicker, CustomTimePicker
  con modo rueda + reloj circular) reemplazando los nativos del SO
- Vista de escritorio: sidebar de navegación agrupable + TopBar con
  buscador global, layout ancho sin "marco de ventana"
- Pantalla de bloqueo dividida (bienvenida + PIN) en escritorio,
  simple en celular — PIN real con hash SHA-256 (en progreso: bug de
  verificación pendiente de resolver)
- WebAuthn para huella/Face ID (cae al PIN del sistema si el celular
  no tiene huella registrada a nivel de Android)

## Pendiente / decisiones tomadas
- Multi-usuario: se descartó Modelo B (login centralizado) por ahora.
  Se eligió Modelo 2 (cada usuario conecta su propio Google
  Sheet/Drive) para fase de prueba con 2-3 usuarios, antes de migrar a
  base de datos real (Supabase/Firebase) cuando se venda el producto.
- Pendiente: pantalla en Ajustes para que cada usuario pegue su propia
  URL de Apps Script (en vez de depender del .env fijo).
- Pendiente: depurar por qué el PIN configurado no valida correctamente
  al desbloquear.

## Estructura de datos clave (Google Sheet)
- Hoja "RUCs": RUC, RAZON SOCIAL, USUARIO, CLAVE, GRUPO, ORDEN,
  USUARIO AFP NET, CLAVE AFP NET, CLIENT_ID_VCP, CLIENT_SECRET_VCP,
  ID SIRE, CLAVE SIRE
- Hoja "Tributos": TRIBUTO, DECLARACION (colores automáticos por
  declaración distinta)
- Hoja "Notas": RUC, JSON_NOTAS, Última actualización
- Hoja "Tax Status": CODIGO, RUC, RAZON SOCIAL, AÑO, MES, TRIBUTO,
  IMPORTE DEUDA, PAGADO DECLARACIONES, PAGADO AFP, TOTAL PAGADO,
  SALDO PENDIENTE, ESTADO, OBSERVACIONES (solo se traen filas con
  SALDO PENDIENTE > 0)
- Hojas "sire" / "dj mensual" / "dj anual": cronograma por dígito de RUC
- Códigos de tributo AFP (texto): INTEGRA, PROFUTURO, HABITAT, PRIMA —
  el resto son códigos numéricos SUNAT

---

## [Sin fecha] — Sesión más reciente
- Intento de PIN real con hash SHA-256 — build compiló, pero la
  verificación no funciona en el celular. En diagnóstico.