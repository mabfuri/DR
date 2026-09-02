import { supabase } from './supabase'

const SITE_URL = 'https://dolarrise.pages.dev'

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, username, whatsapp, profileData = {}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.')
  const normalizedWhatsapp = String(whatsapp || '').trim()
  const metadata = {
    username,
    whatsapp: normalizedWhatsapp,
    nik: String(profileData.nik || '').trim(),
    full_name: String(profileData.full_name || '').trim(),
    bank: String(profileData.bank || '').trim(),
    account_number: String(profileData.account_number || '').trim(),
    address: String(profileData.address || '').trim(),
    sponsor: String(profileData.sponsor || '').trim(),
    paket_join: String(profileData.paket_join || '').trim(),
    ahli_waris: String(profileData.ahli_waris || '').trim(),
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: SITE_URL,
    },
  })
  if (error) throw error

  // Jika email confirmation dimatikan dan session langsung tersedia,
  // pastikan data profil tersimpan juga.
  if (data?.user?.id && data.session) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update(metadata)
      .eq('id', data.user.id)
    if (profileError) throw profileError
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
