import { supabase } from '../../services/db.js'
import { withAuth } from '../../utils/withAuth.js'
import { withJsonResponse } from '../../utils/withJsonResponse.js'

/**
 * @swagger
 * /partidos/cercanos:
 *   get:
 *     summary: Busca partidos cercanos disponibles
 *     description: Retorna partidos futuros ordenados por cercanía a la ubicación del usuario.
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
        const { lat, lng, radio } = query;

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
        const searchRadius = radio ? parseFloat(radio) : 50; // Default 50km

        // 🔍 Modo MOCK
        if (process.env.USE_DB_MOCK === 'true') {
            const mockPartidos = [
                {
                    id: 'mock-1',
                    nombre: 'Partido Lejano',
                    fecha: '2025-12-01T18:00:00Z',
                    lat: -33.00, // Lejos
                    lng: -71.00
                },
                {
                    id: 'mock-2',
                    nombre: 'Partido Cercano',
                    fecha: '2025-12-01T19:00:00Z',
                    lat: -33.451, // Muy cerca
                    lng: -70.661
                },
                {
                    id: 'mock-3',
                    nombre: 'Partido Pasado',
                    fecha: '2020-01-01T10:00:00Z', // Pasado
                    lat: -33.45,
                    lng: -70.66
                }
            ];

            // Filtrar futuros y calcular distancia
            const now = new Date().toISOString();
            const partidosFuturos = mockPartidos.filter(p => p.fecha > now);

            const partidosConDistancia = partidosFuturos.map(p => {
                const dist = getDistanceFromLatLonInKm(userLat, userLng, p.lat, p.lng);
                return { ...p, distanciaKm: dist };
            }).filter(p => p.distanciaKm <= searchRadius);

            partidosConDistancia.sort((a, b) => a.distanciaKm - b.distanciaKm);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    partidos: partidosConDistancia,
                    ubicacion_usuario: { lat: userLat, lng: userLng },
                    radio_busqueda_km: searchRadius,
                    mock: true
                })
            };
        }

        // 1. Obtener partidos futuros
        // Nota: Supabase espera formato ISO para fechas
        const now = new Date().toISOString();

        // En un escenario real con muchos datos, esto debería filtrarse más en BD (ej: bounding box)
        // Pero para MVP, traemos los futuros y filtramos en código.
        const { data: partidos, error } = await supabase
            .from('partidos')
            .select('*')
            .gt('fecha', now)
            .order('fecha', { ascending: true });

        if (error) {
            console.error('Error al buscar partidos:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error al buscar partidos' })
            };
        }

        // 2. Calcular distancias y filtrar
        const partidosConDistancia = partidos.map(p => {
            // Si el partido no tiene ubicación, asumimos distancia infinita o lo ignoramos
            if (!p.lat || !p.lng) return { ...p, distanciaKm: null };

            const dist = getDistanceFromLatLonInKm(userLat, userLng, p.lat, p.lng);
            return { ...p, distanciaKm: dist };
        }).filter(p => p.distanciaKm !== null && p.distanciaKm <= searchRadius);

        // 3. Ordenar por cercanía
        partidosConDistancia.sort((a, b) => a.distanciaKm - b.distanciaKm);

        return {
            statusCode: 200,
            body: JSON.stringify({
                partidos: partidosConDistancia,
                ubicacion_usuario: { lat: userLat, lng: userLng },
                radio_busqueda_km: searchRadius
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
