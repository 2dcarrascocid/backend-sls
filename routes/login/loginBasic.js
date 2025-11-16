
/**
 * @swagger
 * /login/basic:
 *   post:
 *     summary: Login básico o con proveedor externo
 *     description: >
 *       Permite iniciar sesión con email/password o mediante Google, Facebook, Instagram usando external_id.
 *       Si el usuario no existe, se crea automáticamente con un perfil BÁSICO.
 *     tags:
 *       - Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: usuario@mail.com
 *               password:
 *                 type: string
 *               nombre:
 *                 type: string
 *               external_id:
 *                 type: string
 *                 example: "provider_99339922"
 *               origen:
 *                 type: string
 *                 enum: [local, google, facebook, instagram]
 *                 example: google
 *     responses:
 *       200:
 *         description: Login exitoso
 *       400:
 *         description: Datos incompletos
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */


import { withAuth } from '../../services/withAuth.js'
import * as crud from "./crud_login.js";
import * as func from "./funciones.js";

export const handlerLocal = async (event) => {
  const body = JSON.parse(event.body || "{}");

  const { email, password, provider, nombre, provider_id } = body;

  try {
    /* ------------------------------------------------
       1) Normalizar email
    --------------------------------------------------*/
    if (!email) throw new Error("El correo es requerido");
    const emailNorm = func.normalizeEmail(email);


    /* ------------------------------------------------
       2) Buscar usuario por email
    --------------------------------------------------*/
    let usuario = await crud.findUserByEmail(emailNorm).catch(() => null);


    /* ------------------------------------------------
       3) Crear usuario si no existe
    --------------------------------------------------*/
    if (!usuario) {
      let passwordHash = null;
      let passwordSalt = null;

      // Si login es local → generar password
      if (provider === "local") {
        if (!password) throw new Error("Debe enviar una contraseña para login local");

        const pass = await func.hashPassword(password);
        passwordHash = pass.hash;
        passwordSalt = pass.salt;
      }

      if (provider !== "local" && !provider_id) {
        throw new Error("provider_id requerido para login con terceros");
      }

      const newUser = {
        email: emailNorm,
        password_hash: passwordHash,
        estado: "activo",
        provider,
        provider_id: provider_id || null,
        metadata: JSON.stringify({ nombre }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      usuario = await crud.createUserIdentity(newUser);

      // Guardar credenciales locales si corresponde
      if (provider === "local") {
        await crud.setLocalCredentials(usuario.id, passwordHash, passwordSalt);
      }
    }


    /* ------------------------------------------------
       4) LOGIN LOCAL → validar contraseña o crear si falta
    --------------------------------------------------*/
    if (provider === "local") {

      if (!password) {
        throw new Error("Debe enviar una contraseña para login local");
      }

      let credenciales = await crud.getLocalCredentials(usuario.id);

      // 🟡 Caso 1: usuario local pero NO tiene credenciales → crearlas
      if (!credenciales || !credenciales.password_hash || !credenciales.password_salt) {
        const pass = await func.hashPassword(password);

        await crud.setLocalCredentials(usuario.id, pass.hash, pass.salt);

        credenciales = {
          password_hash: pass.hash,
          password_salt: pass.salt
        };
      }

      // 🟢 Validar contraseña
      const passwordOk = await func.verifyPassword(
        password,
        credenciales.password_hash,
        credenciales.password_salt
      );


      if (!passwordOk) {
        throw new Error("Contraseña incorrecta");
      }
    }


    /* ------------------------------------------------
       5) Asignar rol por defecto
    --------------------------------------------------*/
    const rolesUsuario = await crud.getUserRoles(usuario.id);

    if (rolesUsuario.length === 0) {
      const roles = await crud.getUserRolesAll();
      const rolBasico = roles.find(r => r.nombre === "basico" || r.nombre === "visor");

      if (!rolBasico) throw new Error("No se encontró rol básico");

      await crud.assignRoleToUser({
        usuario_id: usuario.id,
        id: rolBasico.id,
        created_at: new Date().toISOString()
      });
    }


    /* ------------------------------------------------
       6) Crear tokens
    --------------------------------------------------*/
    const accessToken = await func.generateAccessToken(usuario.id);
    const refreshRaw = func.generateRefreshToken();
    const refreshHash = func.hashRefreshToken(refreshRaw);


    /* ------------------------------------------------
       7) Crear sesión
    --------------------------------------------------*/
    const ip = event?.requestContext?.identity?.sourceIp || "0.0.0.0";
    const userAgent = event?.headers?.["User-Agent"] || "desconocido";

    const user_session = {
      usuario_id: usuario.id,
      refresh_token_hash: refreshHash,
      user_agent: userAgent,
      ip_address: ip,
      dispositivo: userAgent.includes("Mobile") ? "mobile" : "desktop",
      valido: true,
      created_at: new Date().toISOString(),
      expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    await crud.createSession(user_session);


    /* ------------------------------------------------
       8) Retornar respuesta final
    --------------------------------------------------*/
    return {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        provider: usuario.provider,
        nombre: JSON.parse(usuario.metadata || "{}").nombre
      },
      access_token: accessToken,
      refresh_token: refreshRaw
    };

  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
};


export const handler = withAuth(handlerLocal);


