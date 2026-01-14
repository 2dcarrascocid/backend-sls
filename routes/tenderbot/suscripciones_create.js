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
 *               periodicidad: { type: string, enum: [MENSUAL, SEMESTRAL, ANUAL] }
 *     responses:
 *       201: { description: Suscripción creada }
 *       409: { description: Cliente ya tiene suscripción activa }
 *       400: { description: Plan no válido, inactivo o precio no configurado }
 */
export const handlerLocal = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    const { cliente_id, plan_id, periodicidad } = body

    if (!cliente_id || !plan_id || !periodicidad) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan campos' }) }
    }
    if (!['MENSUAL', 'SEMESTRAL', 'ANUAL'].includes(periodicidad)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Periodicidad inválida. Valores permitidos: MENSUAL, SEMESTRAL, ANUAL' }) }
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
    const { data: existing } = await supabase
        .from('tb_suscripciones')
        .select('id')
        .eq('cliente_id', cliente_id)
        .eq('estado', 'ACTIVA')
        .maybeSingle()
    
    if (existing) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Cliente ya tiene una suscripción activa' }) }
    }

    // 4. Calcular precios y fechas
    // Se usa el precio_mensual como base para calcular descuentos
    if (plan.precio_mensual === undefined || plan.precio_mensual === null || plan.precio_mensual < 0) {
         return { statusCode: 400, body: JSON.stringify({ error: 'El plan no tiene un precio mensual válido para calcular la suscripción' }) }
    }

    let precio_acordado;
    if (periodicidad === 'MENSUAL') {
        precio_acordado = plan.precio_mensual;
    } else if (periodicidad === 'SEMESTRAL') {
        // 5% descuento: (Mensual * 6) * 0.95
        precio_acordado = Math.round((plan.precio_mensual * 6) * 0.95);
    } else { // ANUAL
        // 20% descuento: (Mensual * 12) * 0.80
        precio_acordado = Math.round((plan.precio_mensual * 12) * 0.80);
    }

    const fecha_inicio = new Date()
    const proxima_facturacion = new Date(fecha_inicio)
    
    if (periodicidad === 'MENSUAL') {
        proxima_facturacion.setMonth(proxima_facturacion.getMonth() + 1)
    } else if (periodicidad === 'SEMESTRAL') {
        proxima_facturacion.setMonth(proxima_facturacion.getMonth() + 6)
    } else {
        proxima_facturacion.setFullYear(proxima_facturacion.getFullYear() + 1)
    }

    const subId = crypto.randomUUID()
    const subData = {
        id: subId,
        cliente_id,
        plan_id,
        periodicidad,
        estado: 'ACTIVA', 
        fecha_inicio: fecha_inicio.toISOString(),
        proxima_facturacion: proxima_facturacion.toISOString(),
        precio_acordado,
        moneda: plan.moneda || 'CLP',
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
        moneda: plan.moneda || 'CLP',
        estado: 'PENDIENTE',
        created_at: new Date().toISOString()
    }

    const { error: insertPagoErr } = await supabase
        .from('tb_pagos')
        .insert([pagoData])

    if (insertPagoErr) {
        // Rollback suscripción
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
