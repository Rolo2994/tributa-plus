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

// ── Lectura de cronogramas de vencimiento (sire / dj mensual / dj anual) ──
function getVencimientos_(tipo, mes, anio) {
  const nombreHoja = HOJAS_VENC[tipo]
  if (!nombreHoja) throw new Error('Tipo de vencimiento no válido: ' + tipo)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja)
  if (!sheet) throw new Error('No se encontró la hoja "' + nombreHoja + '"')

  const values = sheet.getDataRange().getValues()
  const headers = values[0] // A vacío/"MES", B..= dígitos
  const mesBuscado = String(mes || '').toUpperCase()

  const fila = values.slice(1).find((r) => String(r[0]).trim().toUpperCase() === mesBuscado)
  if (!fila) return {}

  const resultado = {}
  for (let i = 1; i < headers.length; i++) {
    const digito = String(headers[i]).trim()
    const valor = fila[i]
    resultado[digito] = valor instanceof Date ? Utilities.formatDate(valor, 'GMT-5', 'yyyy-MM-dd') : valor
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
    return JSON.parse(fila[1])
  } catch (e) {
    return { observaciones: '', tributos: [] }
  }
}

function saveNotas_(ruc, notasJsonString) {
  const sheet = getOrCreateNotasSheet_()
  const values = sheet.getDataRange().getValues()
  const idx = values.findIndex((r) => String(r[0]).trim() === String(ruc).trim())
  const ahora = new Date()

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

// ── Log de actividad (auditoría opcional) ─────────────────────────
function logActivity_(ruc, mensaje) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(HOJA_LOG)
  if (!sheet) {
    sheet = ss.insertSheet(HOJA_LOG)
    sheet.appendRow(['Fecha/Hora', 'RUC', 'Mensaje'])
  }
  sheet.appendRow([new Date(), ruc, mensaje])
  return { logged: true }
}
