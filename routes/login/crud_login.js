// login/crud.js
import { supabase } from './../../services/db.js';
import * as funciones from './funciones.js';

/* -----------------------------------------
   🔵 CRUD: IDENTIDADES (el_dep_identidades)
----------------------------------------- */

export async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .select("*")
    .eq("email", email)
    .single();

  if (error) return null;

  return data;
}

export async function findUserById(id) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createUserIdentity({ email, provider, metadata }) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .insert([{ email, provider, metadata }])
    .select()
    .single();

  if (error) throw new Error("Error creando identidad: " + error.message);
  return data;
}

export async function updateUserIdentity(id, dataToUpdate) {
  const { data, error } = await supabase
    .from("el_dep_identidades")
    .update(dataToUpdate)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error("Error actualizando usuario: " + error.message);
  return data;
}

/* -----------------------------------------
   🔐 CREDENCIALES LOCALES (password hash)
----------------------------------------- */

export async function setLocalCredentials(userId, passwordHash, salt) {
  const { data, error } = await supabase
    .from("el_dep_credenciales_locales")
    .upsert({
      usuario_id: userId,
      password_hash: passwordHash,
      password_salt: salt,
      ultimo_cambio: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error("Error guardando credenciales: " + error.message);
  return data;
}

export async function getLocalCredentials(userId) {
  const { data, error } = await supabase
    .from("el_dep_credenciales_locales")
    .select("*")
    .eq("usuario_id", userId)
    .single();

  if (error) return null;
  return data;
}

/* -----------------------------------------
   🔵 PROVEEDORES SOCIALES (OAuth)
----------------------------------------- */

export async function findOrCreateSocialIdentity({
  proveedor,
  proveedor_user_id,
  email,
  metadata,
}) {
  // Buscar si ya existe
  let { data, error } = await supabase
    .from("el_dep_proveedor_autenticacion")
    .select("*")
    .eq("proveedor", proveedor)
    .eq("proveedor_user_id", proveedor_user_id)
    .single();

  if (!error && data) return data;

  // Crear identidad nueva
  const { data: newRow, error: insertError } = await supabase
    .from("el_dep_proveedor_autenticacion")
    .insert([{ proveedor, proveedor_user_id, email, metadata }])
    .select()
    .single();

  if (insertError) throw new Error("Error creando identidad social");
  return newRow;
}

export async function linkSocialProviderToUser(userId, providerData) {
  const { data, error } = await supabase
    .from("el_dep_proveedor_autenticacion")
    .update({ usuario_id: userId })
    .eq("proveedor", providerData.proveedor)
    .eq("proveedor_user_id", providerData.proveedor_user_id)
    .select()
    .single();

  if (error) throw new Error("Error vinculando proveedor social");
  return data;
}

/* -----------------------------------------
   🟣 ROLES & PERMISOS
----------------------------------------- */

export async function getUserRoles(userId) {
console.log("dadadad",userId)
  const { data, error } = await supabase
    .from("el_dep_usuario_roles")
    .select("rol_id, el_dep_roles(nombre)")
    .eq("usuario_id", userId);

  if (error) throw new Error("Error obteniendo roles", error);
  return data.map((r) => r.el_dep_roles.nombre);
}

export async function getUserRolesDet(userId) {
    console.log("dadadad",userId)
      const { data, error } = await supabase
        .from("el_dep_usuario_roles")
        .select("rol_id, el_dep_roles(nombre)")
        .eq("usuario_id", userId);
    
      if (error) throw new Error("Error obteniendo roles", error);
      return data.map((r) => r.el_dep_roles);
    }

export async function getUserRolesAll() {
    const { data, error } = await supabase
      .from("el_dep_roles")
      .select("id, nombre");
  
    if (error) throw new Error("Error obteniendo todos los roles");
    return data;
  }

export async function getUserPermissions(userId) {
  const { data, error } = await supabase
    .from("el_dep_usuario_roles")
    .select(
      `
        rol_id,
        el_dep_roles_permisos (
          permiso_id,
          el_dep_permisos (nombre)
        )
      `
    )
    .eq("usuario_id", userId);

  if (error) throw new Error("Error obteniendo permisos");

  const permisos = new Set();

  data.forEach((r) => {
    r.el_dep_roles_permisos.forEach((p) => {
      permisos.add(p.el_dep_permisos.nombre);
    });
  });

  return Array.from(permisos);
}

export async function assignRoleToUser(usuario) {

  // Buscar id del rol
  const { data: role, error: roleError } = await supabase
    .from("el_dep_roles")
    .select("*")
    .eq("id", usuario.id)
    .single();

  if (roleError) throw new Error("Rol no existe");

  const { data, error } = await supabase
    .from("el_dep_usuario_roles")
    .insert([{ usuario_id: usuario.usuario_id, rol_id: usuario.id , created_at: usuario.created_at}])
    .select()
    .single();

  if (error) throw new Error("Error asignando rol al usuario");

  return data;
}

/* -----------------------------------------
   🔐 SESIONES (refresh token)
----------------------------------------- */

export async function createSession(user) {
    console.log("user_session::::",user)
    const {usuario_id,
        refresh_token_hash,
        user_agent,
        ip_address,
        dispositivo,
        valido,
        created_at,
        expire_at} = user

  const { data, error } = await supabase
    .from("el_dep_sesiones")
    .insert([
      {
        usuario_id: usuario_id,
        refresh_token_hash: refresh_token_hash,
        user_agent: user_agent,
        ip_address: ip_address,
        dispositivo: dispositivo,
        valido: valido,
        created_at:created_at,
        expire_at: expire_at
      },
    ])
    .select()
    .single();

    console.log("error:::::",error)
  if (error) throw new Error("Error creando sesión");

  return data;
}

export async function findSessionByRefreshHash(refreshTokenHash) {
  const { data, error } = await supabase
    .from("el_dep_sesiones")
    .select("*")
    .eq("refresh_token_hash", refreshTokenHash)
    .eq("valido", true)
    .single();

  if (error) return null;
  return data;
}

export async function invalidateSession(sessionId) {
  await supabase
    .from("el_dep_sesiones")
    .update({ valido: false })
    .eq("id", sessionId);
}

export async function invalidateAllSessionsForUser(userId) {
  await supabase
    .from("el_dep_sesiones")
    .update({ valido: false })
    .eq("usuario_id", userId);
}

/* -----------------------------------------
   🔴 BLACKLIST TOKENS
----------------------------------------- */

export async function addTokenToBlacklist(tokenHash, reason) {
  await supabase.from("el_dep_token_blacklist").insert([
    {
      token_hash: tokenHash,
      motivo: reason,
    },
  ]);
}

export async function isTokenBlacklisted(tokenHash) {
  const { data, error } = await supabase
    .from("el_dep_token_blacklist")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  return !!data;
}

/* -----------------------------------------
   🟢 OPERACIONES COMBINADAS
----------------------------------------- */

export async function loginLocal({ email, password }) {
  const normalizedEmail = funciones.normalizeEmail(email);

  const user = await findUserByEmail(normalizedEmail);
  if (!user) throw new Error("Usuario no encontrado");

  const credentials = await getLocalCredentials(user.id);
  if (!credentials) throw new Error("Usuario sin credenciales locales");

  const validPass = await funciones.verifyPassword(
    password,
    credentials.password_hash
  );

  if (!validPass) throw new Error("Credenciales inválidas");

  return user;
}

export async function registerLocalUser({ email, password, metadata }) {
  const normalizedEmail = funciones.normalizeEmail(email);

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) throw new Error("Email ya registrado");

  const user = await createUserIdentity({
    email: normalizedEmail,
    provider: "local",
    metadata,
  });

  const { hash, salt } = await funciones.hashPassword(password);

  await setLocalCredentials(user.id, hash, salt);

  await assignRoleToUser(user.id, "jugador");

  return user;
}
