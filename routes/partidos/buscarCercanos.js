import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'
import { encodeNext, decodeNext } from '../../utils/pagination.js'

/**
 * @swagger
 * /partidos/cercanos:
 *   get:
 *     summary: Busca partidos cercanos disponibles
 *     description: Retorna partidos futuros públicos ordenados por cercanía a la ubicación del usuario.
 *     tags:
 *       - Partidos
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: Latitud del usuario
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: Longitud del usuario
 *       - in: query
 *         name: radio
 *         schema:
 *           type: number
 *           default: 50
 *         description: Radio de búsqueda en kilómetros (opcional, por defecto 50km)
 *       - in: query
 *         name: next
 *         description: Token de paginación
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de partidos cercanos
 *       400:
 *         description: Faltan parámetros de ubicación
 */

// Función para calcular distancia usando fórmula de Haversine
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la tierra en km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distancia en km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

export const handlerLocal = async (event) => {
    try {
        const query = event.queryStringParameters || {};
        const { lat, lng } = query;

        if (!lat || !lng) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Se requieren latitud (lat) y longitud (lng)'
                })
            };
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const radio = query.radio ? parseFloat(query.radio) : 50; // Default 50km

        // Paginación
        let limit = 10;
        let offset = 0;
        if (query.next) {
            const decoded = decodeNext(query.next);
            if (decoded) {
                offset = decoded.offset;
                limit = decoded.limit;
            }
        }

        const now = new Date().toISOString();

        // 🔍 MOCK MODE
        if (process.env.USE_DB_MOCK === 'true') {
            const mockPartidos = [
                {
                    id: 'mock-1',
                    nombre: 'Partido Lejano',
                    fecha: '2025-12-01T18:00:00Z',
                    lat: -33.00, // Lejos
                    lng: -71.00,
                    tipo: 'publico'
                },
                {
                    id: 'mock-2',
                    nombre: 'Partido Cercano',
                    fecha: '2025-12-01T19:00:00Z',
                    lat: -33.451, // Muy cerca
                    lng: -70.661,
                    tipo: 'publico'
                },
                {
                    id: 'mock-descarta',
                    nombre: 'Partido Privado',
                    fecha: '2025-12-01T20:00:00Z',
                    lat: -33.451,
                    lng: -70.661,
                    tipo: 'privado'
                }
            ];

            const futuros = mockPartidos.filter(p => p.fecha > now && p.tipo === 'publico');

            const conDistancia = futuros.map(p => {
                const dist = getDistanceFromLatLonInKm(userLat, userLng, p.lat, p.lng);
                return { ...p, distanciaKm: dist };
            }).filter(p => p.distanciaKm <= radio);

            conDistancia.sort((a, b) => a.distanciaKm - b.distanciaKm);

            const total = conDistancia.length;
            const items = conDistancia.slice(offset, offset + limit);

            let nextToken = null;
            if (offset + limit < total) {
                nextToken = encodeNext(offset + limit, limit);
            }

            return {
                statusCode: 200,
                body: JSON.stringify({
                    partidos: items,
                    ubicacion_usuario: { lat: userLat, lng: userLng },
                    radio_busqueda_km: radio,
                    total_registros: total,
                    next: nextToken
                })
            };
        }

        // 1. Obtener partidos futuros y PÚBLICOS
        // Nota: Traemos todos los futuros públicos para calcular distancia en código (MVP).
        const { data: partidos, error } = await supabase
            .from('partidos')
            .select('*')
            .gt('fecha', now)
            .eq('tipo', 'publico')
            .order('fecha', { ascending: true });

        if (error) {
            console.error('Error al buscar partidos:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al buscar partidos' })
            };
        }

        // 2. Calcular distancias y filtrar por radio
        const filtrados = partidos
            .map(p => {
                if (!p.lat || !p.lng) return { ...p, distanciaKm: null };
                const d = getDistanceFromLatLonInKm(userLat, userLng, p.lat, p.lng);
                return { ...p, distanciaKm: d };
            })
            .filter(p => p.distanciaKm !== null && p.distanciaKm <= radio);

        // 3. Ordenar por cercanía
        filtrados.sort((a, b) => a.distanciaKm - b.distanciaKm);

        // 4. Paginación en memoria
        const totalRegistros = filtrados.length;
        const pageItems = filtrados.slice(offset, offset + limit);

        // 5. Calcular next token
        let nextToken = null;
        if (offset + limit < totalRegistros) {
            nextToken = encodeNext(offset + limit, limit);
        }

        // 6. Retornar respuesta
        return {
            statusCode: 200,
            body: JSON.stringify({
                partidos: pageItems,
                ubicacion_usuario: {
                    lat: userLat,
                    lng: userLng
                },
                radio_busqueda_km: radio,
                total_registros: totalRegistros,
                next: nextToken
            })
        };

    } catch (error) {
        console.error('Error en buscarPartidosCercanos:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

export const handler = withAuth(withJsonResponse(handlerLocal));
