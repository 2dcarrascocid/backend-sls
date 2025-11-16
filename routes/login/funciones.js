// login/funciones.js
import crypto from "crypto";
import jwt from "jsonwebtoken";
import * as crud from "./crud_login.js";

/* ---------------------------------------------------------
   CONFIGURACIÓN GENERAL
--------------------------------------------------------- */

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access-secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh-secret";

const ACCESS_TOKEN_EXP = "15m"; // recomendado
const REFRESH_TOKEN_BYTES = 64; // length de refresh token

/* ---------------------------------------------------------
   ✨ NORMALIZACIÓN
--------------------------------------------------------- */

export function normalizeEmail(email) {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/* ---------------------------------------------------------
   🔐 HASH DE PASSWORD (PBKDF2 / crypto)
--------------------------------------------------------- */

export function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.pbkdf2(password, salt, 310000, 32, "sha256", (err, hashed) => {
      if (err) return reject(err);

      resolve({
        hash: hashed.toString("hex"),
        salt,
      });
    });
  });
}

export function verifyPassword(password, hash, salt) {
    return new Promise((resolve, reject) => {
      if (!salt || !hash) {
        return reject(new Error("Salt o hash inválido"));
      }
  
      crypto.pbkdf2(password, salt, 310000, 32, "sha256", (err, hashed) => {
        if (err) return reject(err);
  
        resolve(hashed.toString("hex") === hash);
      });
    });
  }
  

// export function verifyPassword(password, storedHash) {
//   return new Promise((resolve, reject) => {
//     const [salt, hash] = storedHash.includes(":")
//       ? storedHash.split(":") // formato hash:salt (legacy)
//       : [null, storedHash];

//     if (!salt) return reject(new Error("Salt inválido"));

//     crypto.pbkdf2(password, salt, 310000, 32, "sha256", (err, hashed) => {
//       if (err) return reject(err);
//       resolve(hashed.toString("hex") === hash);
//     });
//   });
// }

/* ---------------------------------------------------------
   🔐 GENERACIÓN DE TOKENS (JWT)
--------------------------------------------------------- */

export async function generateAccessToken(userId) {

const rol = await crud.getUserRolesDet(userId)

  const payload = {
    sub: userId,
    roles: rol
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
}

/* ---------------------------------------------------------
   🔃 GENERACIÓN DE REFRESH TOKEN (secure)
--------------------------------------------------------- */

export function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

/* ---------------------------------------------------------
   🔏 HASH DE REFRESH TOKEN (para almacenar en BD)
--------------------------------------------------------- */

export function hashRefreshToken(refreshToken) {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
}

/* ---------------------------------------------------------
   🧹 SANITIZACIÓN DE USUARIO
--------------------------------------------------------- */

export function sanitizeUserData(user) {
  if (!user) return null;

  const clean = { ...user };
  delete clean.password_hash;
  delete clean.password_salt;
  delete clean.refresh_token_hash;

  return clean;
}

/* ---------------------------------------------------------
   🔐 VALIDADOR DE ROLES Y PERMISOS
--------------------------------------------------------- */

export function hasRole(userRoles, requiredRole) {
  return userRoles.includes(requiredRole);
}

export function hasPermission(userPermissions, requiredPermission) {
  return userPermissions.includes(requiredPermission);
}

/* ---------------------------------------------------------
   📦 RESPUESTA ESTÁNDAR DE LOGIN
--------------------------------------------------------- */

export function buildAuthResponse({
  user,
  roles,
  permisos,
  accessToken,
  refreshToken,
  sessionId,
}) {
  return {
    usuario: sanitizeUserData(user),
    roles,
    permisos,
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      session_id: sessionId,
    },
  };
}

/* ---------------------------------------------------------
   🧰 CONSTRUCCIÓN DE DATOS DE SESIÓN
--------------------------------------------------------- */

export function buildSessionMetadata(event) {
  return {
    userAgent: event.headers["User-Agent"] || "unknown",
    ip: event.headers["X-Forwarded-For"] || "127.0.0.1",
    device: event.headers["X-Device"] || "unknown",
  };
}

/* ---------------------------------------------------------
   🧱 GENERAR EXPIRACIÓN PARA REFRESH TOKEN
--------------------------------------------------------- */

export function refreshTokenExpireAt(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
