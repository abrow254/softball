import { createClient } from '@/lib/supabase/server'

const BUCKET = 'scorecards'

export interface GamePhoto {
  id: string
  storage_path: string
  url: string
  created_at: string
}

// Scorecard photos attached to a game, oldest first, with public URLs resolved.
export async function getGamePhotos(gameId: string): Promise<GamePhoto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('game_photos')
    .select('id, storage_path, created_at')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    storage_path: row.storage_path as string,
    url: supabase.storage.from(BUCKET).getPublicUrl(row.storage_path as string).data.publicUrl,
    created_at: row.created_at as string,
  }))
}

// Upload one scorecard image for a game: store the file, then record the row.
// Runs as the logged-in user, so storage + table RLS enforce admin-only.
export async function uploadGamePhoto(gameId: string, file: File): Promise<GamePhoto> {
  const supabase = createClient()

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${gameId}/${crypto.randomUUID()}.${ext}`

  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (upErr) throw new Error(upErr.message)

  const { data, error } = await supabase
    .from('game_photos')
    .insert({ game_id: gameId, storage_path: path })
    .select('id, storage_path, created_at')
    .single()
  if (error) {
    // Roll back the orphaned upload if the row insert failed.
    await supabase.storage.from(BUCKET).remove([path])
    throw new Error(error.message)
  }

  return {
    id: data.id as string,
    storage_path: data.storage_path as string,
    url: supabase.storage.from(BUCKET).getPublicUrl(data.storage_path as string).data.publicUrl,
    created_at: data.created_at as string,
  }
}

// Remove a scorecard photo (row + underlying file).
export async function deleteGamePhoto(id: string): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('game_photos')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return

  const { error: delErr } = await supabase.from('game_photos').delete().eq('id', id)
  if (delErr) throw new Error(delErr.message)
  await supabase.storage.from(BUCKET).remove([data.storage_path as string])
}
