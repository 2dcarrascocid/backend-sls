import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import crypto from "crypto"

/**
 * @swagger
 * /tenderbot/suscripciones:
 *   post:
 *     summary: Crear suscripción
 *     tags: [TenderBot Suscripciones]
 *     parameters:
 *       - in: header
 *         name: x-api-key
 *         required: true
 *         description: API Key para autenticar la solicitud
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cliente_id, plan_id, periodicidad]
 *             properties:
 *               cliente_id: { type: string, format: uuid }
 *               plan_id: { type: string, format: uuid }
 *               periodicidad: { type: string, enum: [MENSUAL, ANUAL] }
 *     responses:
 *       201: { description: Suscripción creada }
 *       409: { description: Cliente ya tiene suscripción activa }
 *       400: { description: Plan no válido o inactivo }
 */
export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { cliente_id, plan_id, periodicidad } = body
    console.log("baody:::::", body)

    if (!cliente_id || !plan_id || !periodicidad) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan campos' }) }
    }
    if (!['MENSUAL', 'ANUAL'].includes(periodicidad)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Periodicidad inválida' }) }
    }

    // 1. Validar cliente
    const { data: cliente, error: errCli } = await supabase
      .from('tb_clientes').select('id').eq('id', cliente_id).single()
    if (errCli || !cliente) return { statusCode: 400, body: JSON.stringify({ error: 'Cliente no existe' }) }

    // 2. Validar plan
    const { data: plan, error: errPlan } = await supabase
      .from('tb_planes').select('*').eq('id', plan_id).single()
    if (errPlan || !plan) return { statusCode: 400, body: JSON.stringify({ error: 'Plan no existe' }) }
    if (!plan.activo) return { statusCode: 400, body: JSON.stringify({ error: 'Plan inactivo' }) }

    // 3. Validar suscripción activa existente
    const { data: activeSub } = await supabase
      .from('tb_suscripciones')
      .select('id')
      .eq('cliente_id', cliente_id)
      .eq('estado', 'ACTIVA')
      .single() // returns error if 0 or >1, checking null is safer with maybeSingle usually but single() throws on 0.

    // If single() throws error because no rows, that's good. If it finds one, that's bad.
    // Actually supabase-js v2: single() returns data or null? No, it returns error if not exactly one.
    // Use maybeSingle()
    const { data: existing, error: errExist } = await supabase
        .from('tb_suscripciones')
        .select('id')
        .eq('cliente_id', cliente_id)
        .eq('estado', 'ACTIVA')
        .maybeSingle()
    
    if (existing) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Cliente ya tiene una suscripción activa' }) }
    }

    // 4. Calcular precios y fechas
    const precio_acordado = periodicidad === 'MENSUAL' ? plan.precio_mensual : plan.precio_anual
    const fecha_inicio = new Date()
    const proxima_facturacion = new Date(fecha_inicio)
    
    if (periodicidad === 'MENSUAL') {
        proxima_facturacion.setMonth(proxima_facturacion.getMonth() + 1)
    } else {
        proxima_facturacion.setFullYear(proxima_facturacion.getFullYear() + 1)
    }

    const subId = crypto.randomUUID()
    const subData = {
        id: subId,
        cliente_id,
        plan_id,
        periodicidad,
        estado: 'ACTIVA', // Asumimos activa al crear, aunque el pago esté pendiente? O estado PENDIENTE_PAGO? Requerimiento dice: "No permitir 2 suscripciones ACTIVA". Asumiremos se crea ACTIVA o tal vez 'PENDIENTE'. El usuario dice "No permitir 2 suscripciones ACTIVA". Asumiré que nace ACTIVA pero con deuda. O tal vez nace 'PENDIENTE' hasta que pague.
        // Pero la regla de negocio dice "No permitir 2 ACTIVA". Si nace ACTIVA, bloquea otras.
        // Asumiré estado 'ACTIVA' para que el servicio funcione, y tiene un pago pendiente.
        fecha_inicio: fecha_inicio.toISOString(),
        proxima_facturacion: proxima_facturacion.toISOString(),
        precio_acordado,
        moneda: plan.moneda,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }

    // 5. Insertar Suscripción
    const { error: insertSubErr } = await supabase
        .from('tb_suscripciones')
        .insert([subData])
    
    if (insertSubErr) throw insertSubErr

    // 6. Crear Pago Inicial
    const periodo_hasta = new Date(proxima_facturacion)
    periodo_hasta.setDate(periodo_hasta.getDate() - 1)

    const pagoId = crypto.randomUUID()
    const pagoData = {
        id: pagoId,
        suscripcion_id: subId,
        periodo_desde: fecha_inicio.toISOString(),
        periodo_hasta: periodo_hasta.toISOString(),
        monto: precio_acordado,
        moneda: plan.moneda,
        estado: 'PENDIENTE',
        created_at: new Date().toISOString()
    }

    const { error: insertPagoErr } = await supabase
        .from('tb_pagos')
        .insert([pagoData])

    if (insertPagoErr) {
        // Rollback suscripción (manual cleanup since no transaction block easily avail in JS client without RPC)
        await supabase.from('tb_suscripciones').delete().eq('id', subId)
        throw insertPagoErr
    }

    return {
        statusCode: 201,
        body: JSON.stringify({ 
            suscripcion: subData,
            pago_inicial: pagoData
        })
    }

  } catch (error) {
    console.error('Error createSuscripcion:', error)
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno' }) }
  }
}
export const handler = withAuth(withJsonResponse(handlerLocal))
