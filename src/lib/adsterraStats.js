import { supabase } from './supabase'

export async function getAdsterraStats() {
  const { data, error } = await supabase.functions.invoke('adsterra-stats', {
    body: { all_time: true },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return {
    impressions: Number(data?.impressions || 0),
    clicks: Number(data?.clicks || 0),
    ctr: Number(data?.ctr || 0),
    cpm: Number(data?.cpm || 0),
    revenue: Number(data?.revenue || 0),
  }
}
