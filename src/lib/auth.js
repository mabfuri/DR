import { supabase } from './supabase'

const SITE_URL = 'https://dolarrise.pages.dev'

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, username, whatsapp) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const normalizedWhatsapp = String(whatsapp || '').trim()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, whatsapp: normalizedWhatsapp },
      emailRedirectTo: SITE_URL,
    },
  })
  if (error) throw error

  // Simpan juga langsung ke profiles saat session tersedia.
  // Trigger database tetap dapat mengisi profil dasar; update ini hanya menambahkan WhatsApp.
  if (data?.user?.id && normalizedWhatsapp) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ whatsapp: normalizedWhatsapp })
      .eq('id', data.user.id)
    if (profileError && data.session) throw profileError
  }
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}
