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

export async function createRoom() {
  let code = makeRoomCode()
  for (;;) {
    const { error } = await supabase.from('rooms').insert({ code })
    if (!error) return code
    if (error.code === '23505') code = makeRoomCode()
    else throw new Error('createRoom: ' + error.message)
  }
}

export async function roomExists(code) {
  const { data, error } = await supabase.from('rooms').select('code').eq('code', code).maybeSingle()
  if (error) throw new Error('roomExists: ' + error.message)
  return Boolean(data)
}

export async function addNote(code, { participantId, participantName, text, color, lang }) {
  const { data: sameColor } = await supabase
    .from('notes')
    .select('id,color')
    .eq('room_code', code)
    .eq('color', color)
    .order('created_at', { ascending: true })

  const colorIndex = { yellow: 0, pink: 1, blue: 2, green: 3 }[color] ?? 0
  const count = (sameColor || []).length
  const x = 420 + colorIndex * 210
  const y = 40 + count * 170

  const { data, error } = await supabase
    .from('notes')
    .insert({
      room_code: code,
      participant_id: participantId,
      participant_name: participantName,
      text,
      color,
      lang,
      x_position: x,
      y_position: y,
      rotation: Math.random() * 4 - 2,
    })
    .select()
    .single()

  if (error) throw new Error('addNote: ' + error.message)
  return data
}

export async function updateParticipantNote(code, noteId, participantId, text) {
  const { error } = await supabase
    .from('notes')
    .update({ text, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('room_code', code)
    .eq('participant_id', participantId)
  if (error) throw new Error('updateNote: ' + error.message)
}

export async function deleteParticipantNote(code, noteId, participantId) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId)
    .eq('room_code', code)
    .eq('participant_id', participantId)
  if (error) console.error(error)
}

export async function deleteNote(code, noteId) {
  const { error } = await supabase.from('notes').delete().eq('id', noteId).eq('room_code', code)
  if (error) console.error(error)
}

export async function moveNote(code, noteId, x, y) {
  const { error } = await supabase
    .from('notes')
    .update({ x_position: x, y_position: y })
    .eq('id', noteId)
    .eq('room_code', code)
  if (error) console.error(error)
}

export async function clearRoom(code) {
  const { error } = await supabase.from('notes').delete().eq('room_code', code)
  if (error) throw new Error('clearRoom: ' + error.message)
}

export function subscribeToNotes(code, onChange) {
  let active = true

  async function refresh() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('room_code', code)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('fetchNotes:', error.message)
      return
    }
    if (active) onChange(data || [])
  }

  refresh()

  const channel = supabase
    .channel('room-' + code)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes', filter: 'room_code=eq.' + code }, refresh)
    .subscribe((status) => console.log('Realtime:', status))

  return () => {
    active = false
    supabase.removeChannel(channel)
  }
}
