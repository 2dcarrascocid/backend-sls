import { supabase } from '../../../services/db.js'

export const deleteClienteWithBackup = async (clienteId) => {
    // Llamada a la función RPC creada en la base de datos
    const { data, error } = await supabase.rpc('tenderbot_backup_and_delete_cliente', {
        p_cliente_id: clienteId
    })

    if (error) {
        console.error('[ClienteService] Error RPC:', error)
        throw error
    }

    return data
}
