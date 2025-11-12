import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl) // ✅ verificar que tenga el valor correcto

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey)