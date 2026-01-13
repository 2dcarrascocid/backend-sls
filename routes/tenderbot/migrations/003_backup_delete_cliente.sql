-- 1. Crear tabla de respaldo si no existe (idéntica a tb_clientes)
CREATE TABLE IF NOT EXISTS tb_clientes_bk (
    LIKE tb_clientes INCLUDING ALL
);

-- 2. Función RPC para respaldo y eliminación atómica
CREATE OR REPLACE FUNCTION tenderbot_backup_and_delete_cliente(p_cliente_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cliente tb_clientes%ROWTYPE;
BEGIN
    -- Verificar si existe el cliente
    SELECT * INTO v_cliente FROM tb_clientes WHERE id = p_cliente_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Cliente no encontrado', 'code', 404);
    END IF;

    -- Verificar dependencias (suscripciones)
    IF EXISTS (SELECT 1 FROM tb_suscripciones WHERE cliente_id = p_cliente_id) THEN
        RETURN json_build_object('success', false, 'error', 'No se puede eliminar el cliente porque tiene suscripciones asociadas', 'code', 409);
    END IF;

    -- Insertar en backup
    INSERT INTO tb_clientes_bk VALUES (v_cliente.*);

    -- Eliminar de tabla original
    DELETE FROM tb_clientes WHERE id = p_cliente_id;

    RETURN json_build_object('success', true, 'cliente_id', p_cliente_id);

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'code', 500);
END;
$$;
