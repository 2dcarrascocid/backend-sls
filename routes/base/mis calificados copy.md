En el proyecto backend-sls, necesito crear un servicio a traves del id_partido retornar  todas las calificaciones de jugadores que se realizaron en ese partido realizadas por el usuario autenticado. ademas de retornar el promedio de calificaciones de ese partido en especifico

Debe tener la funcionalidad de:
listar jugadores asociados al partido (id_jugador,nombre)
listar promedio calificaciones del partido, acumalado por todos los jugadores.
listar calificaciones que realizo el usuario autenticado.


GET    | http://localhost:3000/partidos/mis-calificados

Implementa la lógica en el handler utilizando la misma logica enterior de los demas endpoints.
crea un. nuevo archivo para el handler
crear un nuevo archivo .yml

root/routes/calificaciones/partido.js


returno propuesto
{
    juagadores:[
        {
            id_jugador:1,
            nombre:"Juan",
            promedio_calificaciones:5,
            calificaciones:[
                {
                    id_calificacion:1,
                    calificacion:5,
                    id_usuario:1
                }
            ]
        }
    ]
}

Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.
Implementa la lógica en el handler utilizando la misma logica de los demas endpoints.
actualizar archivo correspondiente 

