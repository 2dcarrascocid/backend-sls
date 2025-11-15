import { supabase } from '../../services/db.js'
// Helper para manejo de errores
function handle(result) {
  if (result.error) throw result.error
  return result.data
}

// ======================================================
// el_dep_login
// ======================================================
export const loginCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_login').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_login').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_login').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_login').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_login').delete().eq('id', id)
    return handle(result)
  }
}



// ======================================================
// el_dep_sesiones
// ======================================================
export const sesionesCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_sesiones').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_sesiones').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_sesiones').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_sesiones').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_sesiones').delete().eq('id', id)
    return handle(result)
  }
}



// ======================================================
// el_dep_token_blacklist
// ======================================================
export const tokenBlacklistCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_token_blacklist').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_token_blacklist').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_token_blacklist').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_token_blacklist').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_token_blacklist').delete().eq('id', id)
    return handle(result)
  }
}



// ======================================================
// el_dep_roles
// ======================================================
export const rolesCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_roles').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_roles').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_roles').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_roles').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_roles').delete().eq('id', id)
    return handle(result)
  }
}



// ======================================================
// el_dep_permisos
// ======================================================
export const permisosCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_permisos').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_permisos').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_permisos').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_permisos').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_permisos').delete().eq('id', id)
    return handle(result)
  }
}



// ======================================================
// el_dep_usuario_roles
// ======================================================
export const usuarioRolesCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_usuario_roles').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_usuario_roles').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_usuario_roles').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_usuario_roles').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_usuario_roles').delete().eq('id', id)
    return handle(result)
  }
}



// ======================================================
// el_dep_rol_permisos
// ======================================================
export const rolPermisosCRUD = {
  create: async (data) => {
    const result = await supabase.from('el_dep_rol_permisos').insert(data).select()
    return handle(result)
  },

  getById: async (id) => {
    const result = await supabase.from('el_dep_rol_permisos').select().eq('id', id).single()
    return handle(result)
  },

  getAll: async () => {
    const result = await supabase.from('el_dep_rol_permisos').select()
    return handle(result)
  },

  update: async (id, data) => {
    const result = await supabase.from('el_dep_rol_permisos').update(data).eq('id', id).select()
    return handle(result)
  },

  delete: async (id) => {
    const result = await supabase.from('el_dep_rol_permisos').delete().eq('id', id)
    return handle(result)
  }
}
