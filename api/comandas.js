import crypto from "node:crypto";
import { getSql } from "./_db.js";

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_BODY_BYTES = 1_000_000;

function send(response, status, payload) {
  response.status(status).json(payload);
}

function parseBody(request) {
  const contentLength = Number(request.headers?.["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  if (!request.body) return {};
  if (typeof request.body === "object") return request.body;
  if (Buffer.byteLength(request.body, "utf8") > MAX_BODY_BYTES) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(request.body);
}

function randomCode() {
  const bytes = crypto.randomBytes(4);
  let suffix = "";
  for (const byte of bytes) suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `CAMO-${suffix}`;
}

function cleanCode(value) {
  return String(value || "").trim().toUpperCase();
}

function publicRecord(row, isAdmin = false) {
  const expired = new Date(row.expires_at).getTime() <= Date.now();
  const record = {
    id: row.id,
    code: row.code,
    title: row.title,
    status: expired ? "expired" : row.status,
    expires_at: row.expires_at,
    data: row.data,
    created_at: row.created_at,
    updated_at: row.updated_at,
    expired,
    isAdmin
  };
  if (isAdmin) record.admin_token = row.admin_token;
  return record;
}

function baseUrl(request) {
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const host = request.headers["x-forwarded-host"] || request.headers.host;
  return host ? `${protocol}://${host}` : "";
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateParticipantUpdate(current, next, ownedPeopleIds) {
  if (current.closed !== next.closed) return "Solo un organizador puede cerrar o reabrir la comanda.";
  for (const field of ["name", "adjustments", "payments"]) {
    if (!sameJson(current[field], next[field])) return "Solo un organizador puede modificar configuración o pagos.";
  }

  const owned = new Set(Array.isArray(ownedPeopleIds) ? ownedPeopleIds : []);
  const before = new Map((current.people || []).map(person => [person.id, person]));
  const after = new Map((next.people || []).map(person => [person.id, person]));

  for (const [id, person] of before) {
    if ((!after.has(id) || !sameJson(person, after.get(id))) && !owned.has(id)) {
      return "Solo puedes editar pedidos creados desde este navegador.";
    }
  }

  return null;
}

async function handleGet(request, response, sql) {
  const code = cleanCode(request.query.code);
  if (!code) return send(response, 400, { error: "Falta el código de la comanda." });

  const rows = await sql`select * from comandas where code = ${code} limit 1`;
  if (!rows.length) return send(response, 404, { error: "Comanda no encontrada." });

  const row = rows[0];
  const isAdmin = Boolean(request.query.admin) && request.query.admin === row.admin_token;
  return send(response, 200, publicRecord(row, isAdmin));
}

async function handlePost(request, response, sql) {
  const body = parseBody(request);
  const title = String(body.title || "").trim().slice(0, 100);
  if (!title || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return send(response, 400, { error: "El título y el estado inicial son obligatorios." });
  }

  const hours = body.expirationHours == null ? null : Number(body.expirationHours);
  const days = body.expirationDays == null ? 2 : Number(body.expirationDays);
  const durationHours = Number.isFinite(hours) ? hours : days * 24;
  if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 24 * 30) {
    return send(response, 400, { error: "La expiración debe estar entre 1 hora y 30 días." });
  }

  const expiresAt = new Date(Date.now() + durationHours * 3_600_000);
  const adminToken = crypto.randomUUID() + crypto.randomBytes(16).toString("hex");
  let row;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    try {
      const rows = await sql`
        insert into comandas (code, title, status, admin_token, expires_at, data)
        values (${code}, ${title}, 'open', ${adminToken}, ${expiresAt.toISOString()}, ${JSON.stringify(body.data)}::jsonb)
        returning *
      `;
      row = rows[0];
      break;
    } catch (error) {
      if (error.code !== "23505") throw error;
    }
  }

  if (!row) return send(response, 500, { error: "No se pudo generar un código único." });
  const origin = baseUrl(request);
  return send(response, 201, {
    ...publicRecord(row, true),
    admin_token: adminToken,
    public_url: `${origin}/g/${row.code}`,
    admin_url: `${origin}/g/${row.code}?admin=${encodeURIComponent(adminToken)}`
  });
}

async function handlePut(request, response, sql) {
  const body = parseBody(request);
  const code = cleanCode(body.code);
  if ((!body.id && !code) || !body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return send(response, 400, { error: "Faltan la comanda o el nuevo estado." });
  }

  const rows = body.id
    ? await sql`select * from comandas where id = ${body.id} and code = ${code} limit 1`
    : await sql`select * from comandas where code = ${code} limit 1`;
  if (!rows.length) return send(response, 404, { error: "Comanda no encontrada." });

  const current = rows[0];
  if (new Date(current.expires_at).getTime() <= Date.now()) {
    return send(response, 410, { error: "Esta comanda ya expiró." });
  }

  const isAdmin = Boolean(body.adminToken) && body.adminToken === current.admin_token;
  if (!isAdmin) {
    if (current.status !== "open" || current.data?.closed) {
      return send(response, 403, { error: "La comanda está cerrada." });
    }
    const permissionError = validateParticipantUpdate(current.data, body.data, body.ownedPeopleIds);
    if (permissionError) return send(response, 403, { error: permissionError });
  }

  if (body.lastKnownUpdatedAt && new Date(body.lastKnownUpdatedAt).getTime() !== new Date(current.updated_at).getTime()) {
    return send(response, 409, {
      error: "La comanda fue modificada desde otro dispositivo. Actualiza antes de guardar para evitar pisar cambios.",
      updated_at: current.updated_at
    });
  }

  const status = body.data.closed ? "closed" : "open";
  const updated = await sql`
    update comandas
    set data = ${JSON.stringify(body.data)}::jsonb,
        title = ${String(body.data.name || current.title).slice(0, 100)},
        status = ${status},
        updated_at = now()
    where id = ${current.id}
    returning *
  `;
  return send(response, 200, publicRecord(updated[0], isAdmin));
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    const sql = getSql();
    if (request.method === "GET") return await handleGet(request, response, sql);
    if (request.method === "POST") return await handlePost(request, response, sql);
    if (request.method === "PUT") return await handlePut(request, response, sql);
    response.setHeader("Allow", "GET, POST, PUT");
    return send(response, 405, { error: "Método no permitido." });
  } catch (error) {
    console.error("Comandas API error", error);
    if (error.message === "PAYLOAD_TOO_LARGE") return send(response, 413, { error: "El estado de la comanda es demasiado grande." });
    if (error instanceof SyntaxError) return send(response, 400, { error: "El cuerpo del pedido no es JSON válido." });
    return send(response, 500, { error: "No se pudo procesar la comanda." });
  }
}
