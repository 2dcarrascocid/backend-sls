En el proyecto backend-sls, necesito modificar el siguiente endpoint:
misAsistencias 
GET    | http://localhost:3000/partidos/mis-asistencias


Debe tener la funcionalidad de:
listar en orden descendente por el campo partidos.fecha 

{
    partidos:[]
    total_partidos:10,
    next:""
}

Usa el stack: Node.js 20, Serverless Framework v4 y Supabase.

Implementa la lógica en el handler utilizando la misma logica de los demas endpoints.

actualizar archivo correspondiente 

