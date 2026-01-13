# Módulo Tender Bot API

Este módulo gestiona Clientes, Planes, Suscripciones y Pagos para el servicio Tender Bot.

## Endpoints

### Planes
- `GET /tenderbot/planes`: Listar planes
- `GET /tenderbot/planes/{id}`: Detalle de plan
- `POST /tenderbot/planes`: Crear plan
- `PATCH /tenderbot/planes/{id}`: Actualizar plan

### Clientes
- `GET /tenderbot/clientes`: Listar clientes
- `GET /tenderbot/clientes/{id}`: Detalle de cliente
- `POST /tenderbot/clientes`: Crear cliente
- `PATCH /tenderbot/clientes/{id}`: Actualizar cliente

### Suscripciones
- `GET /tenderbot/suscripciones`: Listar suscripciones (filtrar por `?cliente_id=...`)
- `GET /tenderbot/suscripciones/{id}`: Detalle
- `POST /tenderbot/suscripciones`: Crear suscripción (genera pago inicial PENDIENTE)
- `PATCH /tenderbot/suscripciones/{id}`: Actualizar

### Pagos
- `GET /tenderbot/pagos`: Listar pagos (filtrar por `?suscripcion_id=...`)
- `GET /tenderbot/pagos/{id}`: Detalle
- `POST /tenderbot/pagos/{id}/marcar-pagado`: Confirmar pago (activa suscripción y avanza facturación)
- `POST /tenderbot/pagos/{id}/marcar-fallido`: Marcar como fallido

## Ejemplos cURL

### Crear Plan
```bash
curl -X POST https://api.url/tenderbot/planes \
  -H "Content-Type: application/json" \
  -d '{
    "codigo": "FULL",
    "nombre": "Plan Full",
    "precio_mensual": 10000,
    "precio_anual": 100000,
    "moneda": "CLP"
  }'
```

### Crear Cliente
```bash
curl -X POST https://api.url/tenderbot/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "razon_social": "Empresa SpA",
    "nombre_contacto": "Juan Perez",
    "email_contacto": "juan@empresa.com",
    "telefono": "+56912345678"
  }'
```

### Crear Suscripción
```bash
curl -X POST https://api.url/tenderbot/suscripciones \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "UUID-CLIENTE",
    "plan_id": "UUID-PLAN",
    "periodicidad": "MENSUAL"
  }'
```

### Confirmar Pago
```bash
curl -X POST https://api.url/tenderbot/pagos/UUID-PAGO/marcar-pagado \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "TRX-12345",
    "proveedor_pago": "STRIPE"
  }'
```

## Servicio de Notificación (Email)

El sistema envía automáticamente un correo de confirmación al `email_contacto` del cliente cuando un pago se marca como `PAGADO`.

### Requisitos
1. Ejecutar migración SQL: `routes/tenderbot/migrations/001_add_email_notificado_en.sql`
2. Configurar variables de entorno SMTP en `.env`.

### Variables de Entorno (.env)
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_SECURE=true
SMTP_FROM="Tender Bot <no-reply@tenderbot.cl>"
```

### Endpoint de Reenvío
Para reenviar manualmente un correo de confirmación:
- `POST /tenderbot/pagos/{id}/reenviar-confirmacion`
- Parámetro opcional: `?force=true` para reenviar aunque ya se haya enviado antes.

```bash
curl -X POST https://api.url/tenderbot/pagos/UUID-PAGO/reenviar-confirmacion?force=true \
  -H "x-api-key: TU_API_KEY"
```

## Servicio de Notificación (Webhook)

El sistema notifica a un webhook externo cada vez que un pago es exitoso (`PAGADO`).

### Configuración
Agregar la URL del webhook en `.env`:
```env
WEBHOOK_PAGOS_EXITOSOS=https://mi-sistema-externo.com/api/webhooks/pagos
```

### Payload del Webhook (POST)
```json
{
  "event": "payment.success",
  "timestamp": "2024-03-20T10:00:00.000Z",
  "data": {
    "pago": {
      "id": "uuid-pago",
      "monto": 10000,
      "moneda": "CLP",
      "estado": "PAGADO",
      "pagado_en": "2024-03-20T10:00:00.000Z",
      ...
    },
    "suscripcion": { ... },
    "cliente": { ... },
    "plan": { ... }
  }
}
```
