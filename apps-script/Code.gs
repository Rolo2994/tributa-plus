/**
 * Code.gs
 * ─────────────────────────────────────────────────────────────
 * Pega este archivo completo en: tu Google Sheet → menú
 * "Extensiones" → "Apps Script" → borra lo que haya en Code.gs →
 * pega esto → guarda → "Implementar" → "Nueva implementación" →
 * tipo "Aplicación web" → Ejecutar como "Yo", Acceso "Cualquier
 * usuario". Copia la URL que te da (termina en /exec) y pégala en
 * el .env de la app React como VITE_SHEETS_API_URL.
 *
 * ESTRUCTURA ESPERADA DEL GOOGLE SHEET (igual que ruc_lista.xlsx):
 *
 * Hoja "RUCs" (hoja principal):
 *   A=RUC  B=RAZON SOCIAL  C=USUARIO  D=CLAVE  E=Grupo
 *   F=fecha SIRE  G=fecha DJ Mensual  H=fecha DJ Anual
 *   I=Orden (dígito de vencimiento; vacío = último dígito del RUC)
 *   J=USUARIO AFP NET  K=CLAVE AFP NET
 *   L=CLIENT_ID_VCP  M=CLIENT_SECRET_VCP
 *
 * Hojas "sire" / "dj mensual" / "dj anual":
 *   Columna A = mes en MAYÚSCULAS (ENERO, FEBRERO...)
 *   Columnas B en adelante = dígitos 0-9 y BC, con la fecha de
 *   vencimiento de ese dígito para ese mes.
 *
 * Hoja "Notas" (la crea este script automáticamente si no existe):
 *   A=RUC  B=JSON_NOTAS (observaciones + tributos)  C=Última actualización
 *
 * Hoja "Log" (la crea este script automáticamente si no existe):
 *   A=Fecha/Hora  B=RUC  C=Mensaje
 */

const HOJA_RUCS = 'RUCs'
const HOJA_NOTAS = 'Notas'
const HOJA_LOG = 'Log'
const HOJAS_VENC = { SIRE: 'sire', 'DJ Mensual': 'dj mensual', 'DJ Anual': 'dj anual' }
const HOJA_TRIBUTOS = 'Tributos'
const HOJA_TAX_STATUS = 'Tax Status'

// ── Punto de entrada para peticiones GET (lecturas) ──────────────
function doGet(e) {
  try {
    const action = e.parameter.action
    let data
    if (action === 'listRucs') {
      data = listRucs_()
    } else if (action === 'getVencimientos') {
      data = getVencimientos_(e.parameter.tipo, e.parameter.mes, e.parameter.anio)
    } else if (action === 'getNotas') {
      data = getNotas_(e.parameter.ruc)
    } else if (action === 'listTributos') {
      data = listTributos_()
    } else if (action === 'listNotas') {
      data = listNotas_()
    } else if (action === 'listTaxStatus') {
      data = listTaxStatus_()
    } else {
      throw new Error('Acción GET no reconocida: ' + action)
    }
    return jsonResponse_({ ok: true, data })
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) })
  }
}

// ── Punto de entrada para peticiones POST (escrituras) ───────────
// IMPORTANTE: el cliente manda Content-Type "text/plain" a propósito
// (evita el preflight CORS que Apps Script no puede responder), pero
// el cuerpo sigue siendo JSON — por eso lo parseamos igual aquí.
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const action = body.action
    let data
    if (action === 'saveNotas') {
      data = saveNotas_(body.ruc, body.notas)
    } else if (action === 'logActivity') {
      data = logActivity_(body.ruc, body.mensaje)
    } else {
      throw new Error('Acción POST no reconocida: ' + action)
    }
    return jsonResponse_({ ok: true, data })
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) })
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}

// ── Lectura de la hoja principal de RUCs ──────────────────────────
function listRucs_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_RUCS)
  if (!sheet) throw new Error('No se encontró la hoja "' + HOJA_RUCS + '"')
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  const rows = values.slice(1).filter((r) => r[0]) // descarta filas sin RUC

  return rows.map((r) => {
    const obj = {}
    headers.forEach((h, i) => {
      obj[String(h).trim()] = r[i]
    })
    return obj
  })
}

function listTributos_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_TRIBUTOS)
  if (!sheet) throw new Error('No se encontró la hoja "' + HOJA_TRIBUTOS + '"')
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  const rows = values.slice(1).filter((r) => r[0])
  return rows.map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[String(h).trim()] = r[i] })
    return obj
  })
}

function listTaxStatus_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_TAX_STATUS)
  if (!sheet) throw new Error('No se encontró la hoja "' + HOJA_TAX_STATUS + '"')
  const values = sheet.getDataRange().getValues()
  const headers = values[0]
  const idxSaldo = headers.indexOf('SALDO PENDIENTE')
  // Solo se envían las filas con deuda real pendiente — reduce el peso
  // de la respuesta y evita mandar filas ya pagadas o sin pendiente.
  const rows = values.slice(1).filter((r) => r[0] && Number(r[idxSaldo] || 0) > 0)
  return rows.map((r) => {
    const obj = {}
    headers.forEach((h, i) => { obj[String(h).trim()] = r[i] })
    return obj
  })
}

// ── Lectura de cronogramas de vencimiento (sire / dj mensual / dj anual) ──
const MESES_ABBR_ = { ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12 }

/** Convierte el texto TAL COMO SE VE en la celda (ej "17-ago-26") a "yyyy-MM-dd", sin pasar por objetos Date. */
function parseFechaDisplay_(texto) {
  const s = String(texto || '').trim().toLowerCase()
  const m1 = s.match(/^(\d{1,2})-([a-záéíóú]{3})-(\d{2,4})$/)
  if (m1) {
    const dia = m1[1].padStart(2, '0')
    const mes = MESES_ABBR_[m1[2]]
    if (!mes) return texto
    let anio = m1[3]
    if (anio.length === 2) anio = '20' + anio
    return `${anio}-${String(mes).padStart(2, '0')}-${dia}`
  }
  const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m2) {
    let anio = m2[3]
    if (anio.length === 2) anio = '20' + anio
    return `${anio}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  }
  return texto // no es fecha (ej. "*TABA SIRE") — se devuelve tal cual
}

function getVencimientos_(tipo, mes, anio) {
  const nombreHoja = HOJAS_VENC[tipo]
  if (!nombreHoja) throw new Error('Tipo de vencimiento no válido: ' + tipo)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja)
  if (!sheet) throw new Error('No se encontró la hoja "' + nombreHoja + '"')

  // getDisplayValues() trae el texto EXACTO que se ve en pantalla —
  // sin convertir nada a objetos de fecha, así no hay riesgo de desfase.
  const values = sheet.getDataRange().getDisplayValues()
  const headers = values[0]
  const mesBuscado = String(mes || '').toUpperCase()

  const fila = values.slice(1).find((r) => String(r[0]).trim().toUpperCase() === mesBuscado)
  if (!fila) return {}

  const resultado = {}
  for (let i = 1; i < headers.length; i++) {
    const digito = String(headers[i]).trim()
    resultado[digito] = parseFechaDisplay_(fila[i])
  }
  return resultado
}

// ── Notas / tributos por RUC (guardadas como JSON en una sola celda) ──
function getNotas_(ruc) {
  const sheet = getOrCreateNotasSheet_()
  const values = sheet.getDataRange().getValues()
  const fila = values.find((r) => String(r[0]).trim() === String(ruc).trim())
  if (!fila) return { observaciones: '', tributos: [] }
  try {
    let parsed = JSON.parse(fila[1])
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed)
    }
    return parsed
  } catch (e) {
    return { observaciones: '', tributos: [] }
  }
}

function saveNotas_(ruc, notasJsonString) {
  const sheet = getOrCreateNotasSheet_()
  const values = sheet.getDataRange().getValues()
  const idx = values.findIndex((r) => String(r[0]).trim() === String(ruc).trim())
  const ahora = Utilities.formatDate(new Date(), 'GMT-5', 'dd/MM/yyyy HH:mm:ss')

  if (idx === -1) {
    sheet.appendRow([ruc, notasJsonString, ahora])
  } else {
    sheet.getRange(idx + 1, 2, 1, 2).setValues([[notasJsonString, ahora]])
  }
  return { saved: true }
}

function getOrCreateNotasSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(HOJA_NOTAS)
  if (!sheet) {
    sheet = ss.insertSheet(HOJA_NOTAS)
    sheet.appendRow(['RUC', 'JSON_NOTAS', 'Última actualización'])
  }
  return sheet
}

function listNotas_() {
  const sheet = getOrCreateNotasSheet_()
  const values = sheet.getDataRange().getValues()
  const resultado = {}
  values.slice(1).forEach((r) => {
    const ruc = String(r[0]).trim()
    if (!ruc) return
    try {
      let parsed = JSON.parse(r[1])
      // Si quedó guardado doblemente codificado (bug anterior), lo desenreda.
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed)
      }
      resultado[ruc] = parsed
    } catch (e) {
      resultado[ruc] = { observaciones: '', tributos: [] }
    }
  })
  return resultado
}

// ── Log de actividad (auditoría opcional) ─────────────────────────
function logActivity_(ruc, mensaje) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(HOJA_LOG)
  if (!sheet) {
    sheet = ss.insertSheet(HOJA_LOG)
    sheet.appendRow(['Fecha/Hora', 'RUC', 'Mensaje'])
  }
  const ahora = Utilities.formatDate(new Date(), 'GMT-5', 'dd/MM/yyyy HH:mm:ss')
  sheet.appendRow([ahora, ruc, mensaje])
  return { logged: true }
}
