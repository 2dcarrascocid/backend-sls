
import { supabase } from '../../services/db.js'
import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/* -------------------------------------------------------
   🔧 CONFIG
------------------------------------------------------- */
const ACCESS_TOKEN_EXPIRES = "30m"; // configurable
const REFRESH_TOKEN_EXPIRES_DAYS = 30;
const JWT_SECRET = process.env.JWT_SECRET;

/* -------------------------------------------------------
   🛠 UTILIDADES GENERALES
------------------------------------------------------- */

// Normaliza email (mantiene único el login)
export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Elimina campos sensibles antes de retornar al cliente
export function sanitizeUserData(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

// Crea estructura estándar para sesión
export function createSessionObject(user, tokens) {
  return {
    user: sanitizeUserData(user),
    tokens,
  };
}

/* -------------------------------------------------------
   🔐 MANEJO DE CONTRASEÑAS
------------------------------------------------------- */

// Hashea contraseña
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Verifica contraseña contra hash
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/* -------------------------------------------------------
   🔑 MANEJO DE TOKENS
------------------------------------------------------- */

// Genera access token (JWT)
export function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      perfil_id: user.perfil_id,
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

// Genera refresh token raw (string aleatoria)
export function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

// Hashea refresh token para almacenarlo
export function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/* -------------------------------------------------------
   🔒 BLACKLIST Y CONTROL DE TOKENS
------------------------------------------------------- */

// Inserta token en blacklist
export async function blacklistToken(refreshTokenHash) {
  await supabase.from("el_dep_refresh_blacklist").insert([
    {
      token_hash: refreshTokenHash,
      invalidated_at: new Date().toISOString(),
    },
  ]);
}

// Verifica si token está en blacklist
export async function isTokenBlacklisted(refreshTokenHash) {
  const { data } = await supabase
    .from("el_dep_refresh_blacklist")
    .select("id")
    .eq("token_hash", refreshTokenHash)
    .maybeSingle();

  return !!data;
}

/* -------------------------------------------------------
   🧩 ROLES Y PERMISOS
------------------------------------------------------- */

// Verifica si usuario tiene un rol requerido
export async function validateRole(userId, requiredRoleName) {
  const { data } = await supabase
    .from("el_dep_roles")
    .select("nombre")
    .eq("id", userId)
    .single();

  if (!data) return false;
  return data.nombre === requiredRoleName;
}

// Verifica si usuario tiene permiso específico
export async function validatePermission(userId, permissionName) {
  const { data } = await supabase
    .from("el_dep_usuarios_roles")
    .select(
      `
      perfiles:perfil_id (
        permisos:permisos (
          nombre
        )
      )
    `
    )
    .eq("usuario_id", userId);

  if (!data || data.length === 0) return false;

  const permisos = data.flatMap((r) => r.perfiles.permisos.map((p) => p.nombre));
  return permisos.includes(permissionName);
}

/* -------------------------------------------------------
   🌐 SOCIAL LOGIN (Google / Facebook / Instagram)
------------------------------------------------------- */

// Base: recibe los datos ya validados del proveedor
export async function loginSocialBase({ email, nombre, provider, provider_id }) {
  const emailNorm = normalizeEmail(email);

  // 1. Buscar si existe
  const { data: usuario } = await supabase
    .from("el_dep_usuarios")
    .select("*")
    .eq("email", emailNorm)
    .maybeSingle();

  // 2. Si no existe → crear usuario básico
  let finalUser = usuario;

  if (!finalUser) {
    const { data: nuevo } = await supabase
      .from("el_dep_usuarios")
      .insert([
        {
          email: emailNorm,
          nombre,
          provider,
          provider_id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    finalUser = nuevo;
  }

  // 3. Generar tokens
  const refreshRaw = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshRaw);

  await supabase.from("el_dep_refresh_tokens").insert([
    {
      usuario_id: finalUser.id,
      token_hash: refreshHash,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 86400000)
        .toISOString(),
    },
  ]);

  const access = generateAccessToken(finalUser);

  return createSessionObject(finalUser, {
    access_token: access,
    refresh_token: refreshRaw,
  });
}






