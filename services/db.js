import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseUrlLiga = process.env.SUPABASE_URL_LIGA
const supabaseServiceKeyLiga = process.env.SUPABASE_SERVICE_ROLE_KEY_LIGA

// console.log('Supabase URL:', supabaseUrlLiga) // ✅ verificar que tenga el valor correcto
// console.log('Supabase URL:', supabaseServiceKeyLiga) // ✅ verificar que tenga el valor correcto

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env')
}

if (!supabaseUrlLiga || !supabaseServiceKeyLiga) {
  throw new Error('❌ Faltan variables SUPABASE_URL_LIGA o SUPABASE_SERVICE_ROLE_KEY_LIGA en el .env')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const supraLiga = createClient(supabaseUrlLiga, supabaseServiceKeyLiga)