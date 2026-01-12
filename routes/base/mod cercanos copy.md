En el proyecto backend-sls, necesito modificar el siguiente endpoint:
buscarPartidosCercanos 
GET    | http://localhost:3000/partidos/cercanos


Debe tener la funcionalidad de:
debe listar los 10 primieros encontrador y si existen mas debe devolver un next para continuar con la busqueda debe contar el total de registros encontrados y solo buscar los "tipo": "publicos",

{
    "partidos": [],
    "ubicacion_usuario": {
        "lat": -33.45,
        "lng": -70.66
    },
    "radio_busqueda_km": 10,
    total_registros: 10,
    next: ""
}

Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.

Implementa la lógica en el handler utilizando la misma logica de los demas endpoints.

actualizar archivo correspondiente 

