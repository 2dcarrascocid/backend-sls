import { withAuth } from '../../services/withAuth.js'

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



import { loginCRUD, sesionesCRUD, rolesCRUD, usuarioRolesCRUD } from './crud_login.js';
import {
  normalizeEmail,
  sanitizeUserData,
  createSessionObject,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken
} from './funciones.js';

/* -------------------------------------------------------
   🔹 LOGIN UNIVERSAL
------------------------------------------------------- */
export async function handlerLocal({ email, password, provider, nombre, provider_id }) {
  console.log("email, password, provider, nombre, provider_id",email, password, provider, nombre, provider_id)
  try {
    // 1️⃣ Normalizar email
    const emailNorm = normalizeEmail(email);

    // 2️⃣ Buscar usuario existente
    let usuario;
    try {
      usuario = await loginCRUD.getAll(); // Traemos todos y filtramos localmente
      usuario = usuario.find(u => u.email === emailNorm);
    } catch (err) {
      usuario = null;
    }

    // 3️⃣ Si usuario no existe → crear
    if (!usuario) {
      let passwordHash = null;
      if (provider === 'local') {
        if (!password) throw new Error('Password requerido para login local');
        passwordHash = await hashPassword(password);
      }

      const newUser = {
        email: emailNorm,
        password_hash: passwordHash,
        estado: 'activo',
        provider,
        metadata: JSON.stringify({ nombre }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const [creado] = await loginCRUD.create(newUser);
      usuario = creado;
    }

    // 4️⃣ Si es local, validar contraseña
    if (provider === 'local') {
      if (!password) throw new Error('Password requerido');
      const validPass = await hashPassword(password);
      const passwordOk = await verifyPassword(password, usuario.password_hash);
      if (!passwordOk) throw new Error('Contraseña incorrecta');
    }

    // 5️⃣ Asignar rol básico si no tiene ninguno
    const rolesAsignados = await usuarioRolesCRUD.getAll();
    const tieneRol = rolesAsignados.some(r => r.usuario_id === usuario.id);

    if (!tieneRol) {
      // Buscar rol viewer
      const roles = await rolesCRUD.getAll();
      const viewerRole = roles.find(r => r.nombre === 'viewer');

      if (viewerRole) {
        await usuarioRolesCRUD.create({
          usuario_id: usuario.id,
          rol_id: viewerRole.id,
          created_at: new Date().toISOString()
        });
      }
    }

    // 6️⃣ Generar tokens
    const accessToken = generateAccessToken(usuario);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshRaw);

    // 7️⃣ Crear sesión
    await sesionesCRUD.create({
      usuario_id: usuario.id,
      refresh_token_hash: refreshHash,
      user_agent: 'N/A',
      ip_address: 'N/A',
      dispositivo: 'N/A',
      valido: true,
      created_at: new Date().toISOString(),
      expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días
    });

    // 8️⃣ Retornar usuario limpio + tokens
    return createSessionObject(usuario, {
      access_token: accessToken,
      refresh_token: refreshRaw
    });

  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}






export const handler = withAuth(handlerLocal)
