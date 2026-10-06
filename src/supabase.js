import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://shbvofvrpcxpopgufvwg.supabase.co',
  'sb_publishable_iS5oSk5MAzvQc_PxnPMeWw_FAxefIbA',
)

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeRoomCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

export async function createRoom(mode = 'grouped') {
  let code = makeRoomCode()
  for (;;) {
    const { error } = await supabase.from('rooms').insert({ code, mode })
    if (!error) return code
    if (error.code === '23505') code = makeRoomCode()
    else throw new Error('createRoom: ' + error.message)
  }
}

export async function getRoom(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select('code,mode,prompt_text,background_data')
    .eq('code', code)
    .maybeSingle()
  if (error) throw new Error('getRoom: ' + error.message)
  return data
}

export async function roomExists(code) {
  return Boolean(await getRoom(code))
}

export async function updateRoom(code, changes) {
  const allowed = {}
  if ('prompt_text' in changes) allowed.prompt_text = changes.prompt_text
  if ('background_data' in changes) allowed.background_data = changes.background_data
  if ('mode' in changes) allowed.mode = changes.mode
  const { data, error } = await supabase
    .from('rooms')
    .update(allowed)
    .eq('code', code)
    .select('code,mode,prompt_text,background_data')
    .single()
  if (error) throw new Error('updateRoom: ' + error.message)
  return data
}

export function subscribeToRoom(code, onChange) {
  let active = true
  async function refresh() {
    const room = await getRoom(code)
    if (active) onChange(room)
  }
  refresh().catch(console.error)
  const channel = supabase
    .channel('room-config-' + code)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: 'code=eq.' + code }, refresh)
    .subscribe()
  return () => {
    active = false
    supabase.removeChannel(channel)
  }
}

export async function addNote(code, { participantId, participantName, text, color, lang, x, y, xRatio, yRatio, mode = 'grouped' }) {
  let xPosition = x
  let yPosition = y
  if (mode === 'place_it' && Number.isFinite(xRatio) && Number.isFinite(yRatio)) {
    xPosition = Number.isFinite(xPosition) ? xPosition : Math.max(0, Math.round(xRatio * 1000 - 95))
    yPosition = Number.isFinite(yPosition) ? yPosition : Math.max(0, Math.round(yRatio * 562.5 - 75))
  } else {
    const { data: sameColor } = await supabase
      .from('notes')
      .select('id,color')
      .eq('room_code', code)
      .eq('color', color)
      .order('created_at', { ascending: true })
    const colorIndex = { yellow: 0, pink: 1, blue: 2, green: 3 }[color] ?? 0
    const count = (sameColor || []).length
    xPosition = 420 + colorIndex * 210
    yPosition = 40 + count * 170
  }
  const { data, error } = await supabase.from('notes').insert({
    room_code: code,
    participant_id: participantId,
    participant_name: participantName,
    text,
    color,
    lang,
    x_position: xPosition,
    y_position: yPosition,
    x_ratio: mode === 'place_it' && Number.isFinite(xRatio) ? xRatio : null,
    y_ratio: mode === 'place_it' && Number.isFinite(yRatio) ? yRatio : null,
    rotation: Math.random() * 4 - 2,
  }).select().single()
  if (error) throw new Error('addNote: ' + error.message)
  return data
}

export async function updateParticipantNote(code, noteId, participantId, text) {
  const { error } = await supabase.from('notes').update({ text, updated_at: new Date().toISOString() })
    .eq('id', noteId).eq('room_code', code).eq('participant_id', participantId)
  if (error) throw new Error('updateNote: ' + error.message)
}

export async function deleteParticipantNote(code, noteId, participantId) {
  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('room_code', code).eq('participant_id', participantId)
  if (error) console.error(error)
}

export async function deleteNote(code, noteId) {
  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('room_code', code)
  if (error) console.error(error)
}

export async function moveNote(code, noteId, x, y, xRatio = null, yRatio = null) {
  const changes = { x_position: x, y_position: y }
  if (Number.isFinite(xRatio) && Number.isFinite(yRatio)) {
    changes.x_ratio = Math.min(1, Math.max(0, xRatio))
    changes.y_ratio = Math.min(1, Math.max(0, yRatio))
  }
  const { error } = await supabase.from('notes').update(changes).eq('id', noteId).eq('room_code', code)
  if (error) console.error(error)
}

export async function clearRoom(code) {
  const { error: notesError } = await supabase.from('notes').delete().eq('room_code', code)
  if (notesError) throw new Error('clearRoom.notes: ' + notesError.message)
  const { error: starError } = await supabase.from('superstar_submissions').delete().eq('room_code', code)
  if (starError && !/relation .* does not exist/i.test(starError.message || '')) {
    throw new Error('clearRoom.superstar: ' + starError.message)
  }
  return true
}

export async function listBackgrounds() {
  const { data, error } = await supabase.from('sticky_backgrounds').select('*').order('created_at', { ascending: false })
  if (error) throw new Error('listBackgrounds: ' + error.message)
  return data || []
}

export async function uploadBackground(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeBase = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'background'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext}`
  const { error: uploadError } = await supabase.storage.from('sticky-backgrounds').upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw new Error('uploadBackground: ' + uploadError.message)
  const { data: publicData } = supabase.storage.from('sticky-backgrounds').getPublicUrl(path)
  const publicUrl = publicData.publicUrl
  const { data, error } = await supabase.from('sticky_backgrounds').insert({ name: file.name, path, public_url: publicUrl }).select().single()
  if (error) {
    await supabase.storage.from('sticky-backgrounds').remove([path])
    throw new Error('saveBackground: ' + error.message)
  }
  return data
}

export async function deleteBackgroundAsset(background) {
  if (!background?.id || !background?.path) return
  const { error: storageError } = await supabase.storage.from('sticky-backgrounds').remove([background.path])
  if (storageError) throw new Error('deleteBackgroundAsset: ' + storageError.message)
  const { error } = await supabase.from('sticky_backgrounds').delete().eq('id', background.id)
  if (error) throw new Error('deleteBackgroundRecord: ' + error.message)
}

export function subscribeToNotes(code, onChange) {
  let active = true
  async function refresh() {
    const { data, error } = await supabase.from('notes').select('*').eq('room_code', code).order('created_at', { ascending: true })
    if (error) { console.error('fetchNotes:', error.message); return }
    if (active) onChange(data || [])
  }
  refresh()
  const channel = supabase.channel('room-' + code)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: 'room_code=eq.' + code }, refresh)
    .subscribe((status) => console.log('Realtime notes:', status))
  return () => { active = false; supabase.removeChannel(channel) }
}

function normalizePersonKey(name = '') {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function uploadSuperstarSelfie(file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safeBase = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'selfie'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}.${ext}`
  const { error } = await supabase.storage.from('superstar-selfies').upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error('uploadSuperstarSelfie: ' + error.message)
  const { data } = supabase.storage.from('superstar-selfies').getPublicUrl(path)
  return { path, publicUrl: data.publicUrl }
}

export async function addSuperstarSubmission(code, { participantId, participantName, peerName, lesson, file }) {
  const upload = await uploadSuperstarSelfie(file)
  const payload = {
    room_code: code,
    participant_id: participantId,
    participant_name: participantName.trim(),
    participant_key: normalizePersonKey(participantName),
    peer_name: peerName.trim(),
    peer_key: normalizePersonKey(peerName),
    lesson: lesson.trim(),
    photo_url: upload.publicUrl,
    photo_path: upload.path,
  }
  const { data, error } = await supabase
    .from('superstar_submissions')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw new Error('addSuperstarSubmission: ' + error.message)
  return data
}

export async function fetchSuperstarSubmissions(code) {
  const { data, error } = await supabase
    .from('superstar_submissions')
    .select('*')
    .eq('room_code', code)
    .order('created_at', { ascending: true })
  if (error) throw new Error('fetchSuperstarSubmissions: ' + error.message)
  return data || []
}

export function subscribeToSuperstarSubmissions(code, onChange) {
  let active = true
  async function refresh() {
    try {
      const data = await fetchSuperstarSubmissions(code)
      if (active) onChange(data)
    } catch (error) {
      console.error(error)
    }
  }
  refresh()
  const channel = supabase
    .channel('superstar-' + code)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'superstar_submissions', filter: 'room_code=eq.' + code }, refresh)
    .subscribe((status) => console.log('Realtime superstar:', status))
  return () => {
    active = false
    supabase.removeChannel(channel)
  }
}
