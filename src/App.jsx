import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import {
  addNote,
  clearRoom,
  createRoom,
  deleteNote,
  deleteParticipantNote,
  deleteBackgroundAsset,
  listBackgrounds,
  moveNote,
  getRoom,
  roomExists,
  subscribeToNotes,
  subscribeToRoom,
  updateParticipantNote,
  updateRoom,
  uploadBackground,
} from './supabase'

const I18N = {
  en: {
    appName: 'Live Sticky Notes',
    facilitatorStart: 'Start a session',
    facilitatorStartHint: 'Create a room and display it on a projector or laptop.',
    createRoom: 'Create room',
    chooseMode: 'Choose a mode',
    groupedMode: 'Grouped Sticky Notes',
    groupedDesc: 'Automatically arrange notes and group them by color.',
    placeItMode: 'Place It',
    placeItDesc: 'Participants choose exactly where their note appears on the canvas.',
    participantJoinHint: 'Have a room code? Join from your phone.',
    enterRoomCode: 'Enter room code',
    join: 'Join',
    yourName: 'Your name',
    namePlaceholder: 'e.g. Sarah',
    roomNotFound: "We couldn't find that room. Check the code and try again.",
    writeNote: 'Write your note',
    notePlaceholder: 'Type your note here…',
    postNote: 'POST NOTE',
    chooseColor: 'Choose a color',
    myNotes: 'My notes',
    noNotesYet: "You haven't posted any notes yet.",
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    postedAs: 'Posting as',
    charactersLeft: 'characters left',
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    roomCode: 'Room code',
    scanToJoin: 'Scan to join',
    hideQr: 'Hide QR',
    showQr: 'Show QR',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    clearScreen: 'Clear screen',
    background: 'Background',
    changeBackground: 'Change background',
    removeBackground: 'Remove background',
    backgroundLibrary: 'Background Library',
    uploadNewBackground: 'Upload new picture',
    savedBackgrounds: 'Saved pictures',
    useBackground: 'Use',
    deleteFromLibrary: 'Delete',
    noSavedBackgrounds: 'No saved pictures yet.',
    screenshot: 'Screenshot',
    promptPanel: 'Facilitator prompt',
    promptPlaceholder: 'Paste your text, facts, steps or instructions here…',
    choosePosition: 'Choose where your note should appear',
    positionHint: 'Tap anywhere on the canvas preview.',
    positionSelected: 'Position selected',
    clearConfirmTitle: 'Clear all sticky notes?',
    clearConfirmBody: 'This removes every note from this room.',
    clearAll: 'Clear all',
    findSimilar: 'Find similar',
    resetSimilarity: 'Reset similarity',
    emptyBoard: 'Notes will appear here as participants post them.',
    similarGroupsFound: (n) => n === 0 ? 'No clearly similar notes found.' : `${n} similar ${n === 1 ? 'group' : 'groups'} highlighted.`,
  },
  ar: {
    appName: 'الملاحظات اللاصقة الحية',
    facilitatorStart: 'ابدأ جلسة',
    facilitatorStartHint: 'أنشئ غرفة واعرضها على جهاز عرض أو حاسوب محمول.',
    createRoom: 'إنشاء غرفة',
    chooseMode: 'اختر الوضع',
    groupedMode: 'الملاحظات المجمّعة',
    groupedDesc: 'ترتيب الملاحظات تلقائيًا وتجميعها حسب اللون.',
    placeItMode: 'Place It',
    placeItDesc: 'يختار المشاركون المكان الذي تظهر فيه ملاحظتهم على اللوحة.',
    participantJoinHint: 'لديك رمز غرفة؟ انضم من هاتفك.',
    enterRoomCode: 'أدخل رمز الغرفة',
    join: 'انضمام',
    yourName: 'اسمك',
    namePlaceholder: 'مثال: سارة',
    roomNotFound: 'تعذر العثور على هذه الغرفة. تحقق من الرمز وحاول مرة أخرى.',
    writeNote: 'اكتب ملاحظتك',
    notePlaceholder: 'اكتب ملاحظتك هنا…',
    postNote: 'انشر الملاحظة',
    chooseColor: 'اختر لونًا',
    myNotes: 'ملاحظاتي',
    noNotesYet: 'لم تنشر أي ملاحظات بعد.',
    edit: 'تعديل',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    postedAs: 'تُنشر باسم',
    charactersLeft: 'حرفًا متبقيًا',
    connected: 'متصل',
    reconnecting: 'إعادة الاتصال…',
    roomCode: 'رمز الغرفة',
    scanToJoin: 'امسح للانضمام',
    hideQr: 'إخفاء الرمز',
    showQr: 'إظهار الرمز',
    fullscreen: 'ملء الشاشة',
    exitFullscreen: 'إنهاء ملء الشاشة',
    clearScreen: 'مسح الشاشة',
    background: 'الخلفية',
    changeBackground: 'تغيير الخلفية',
    removeBackground: 'إزالة الخلفية',
    backgroundLibrary: 'مكتبة الخلفيات',
    uploadNewBackground: 'رفع صورة جديدة',
    savedBackgrounds: 'الصور المحفوظة',
    useBackground: 'استخدام',
    deleteFromLibrary: 'حذف',
    noSavedBackgrounds: 'لا توجد صور محفوظة حتى الآن.',
    screenshot: 'لقطة شاشة',
    promptPanel: 'نص الميسّر',
    promptPlaceholder: 'الصق النص أو الحقائق أو الخطوات أو التعليمات هنا…',
    choosePosition: 'اختر مكان ظهور ملاحظتك',
    positionHint: 'اضغط في أي مكان على معاينة اللوحة.',
    positionSelected: 'تم اختيار المكان',
    clearConfirmTitle: 'مسح جميع الملاحظات؟',
    clearConfirmBody: 'سيؤدي هذا إلى إزالة كل ملاحظة من هذه الغرفة.',
    clearAll: 'مسح الكل',
    findSimilar: 'ابحث عن المتشابه',
    resetSimilarity: 'إعادة ضبط التشابه',
    emptyBoard: 'ستظهر الملاحظات هنا عند نشر المشاركين لها.',
    similarGroupsFound: (n) => n === 0 ? 'لم يتم العثور على ملاحظات متشابهة.' : `تم تمييز ${n} مجموعة متشابهة.`,
  },
}

const LangContext = createContext(null)

function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lsn_lang') || 'en')
  useEffect(() => {
    localStorage.setItem('lsn_lang', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])
  return <LangContext.Provider value={{ lang, setLang, t: I18N[lang] || I18N.en }}>{children}</LangContext.Provider>
}

function useLang() {
  return useContext(LangContext)
}

function LanguageSwitch({ toolbar = false }) {
  const { lang, setLang } = useLang()
  return (
    <div className={`lang-switch ${toolbar ? 'lang-switch-toolbar' : ''}`}>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
      <button type="button" aria-pressed={lang === 'ar'} onClick={() => setLang('ar')}>عربي</button>
    </div>
  )
}

function Home() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [mode, setMode] = useState('grouped')

  async function start() {
    setCreating(true)
    try {
      const room = await createRoom(mode)
      navigate('/facilitator/' + room)
    } catch (e) {
      alert('Error creating room: ' + e.message)
      setCreating(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    const room = code.trim().toUpperCase()
    if (!room) return
    setJoining(true)
    try {
      if (!await roomExists(room)) {
        setError(t.roomNotFound)
        setJoining(false)
        return
      }
      navigate('/join/' + room)
    } catch (e) {
      setError('Error: ' + e.message)
      setJoining(false)
    }
  }

  return (
    <div className="home">
      <LanguageSwitch />
      <div className="home-grid">
        <div className="home-header"><h1 className="home-title">{t.appName}</h1></div>
        <div className="home-card">
          <h2>{t.facilitatorStart}</h2>
          <p>{t.facilitatorStartHint}</p>
          <div className="mode-picker">
            <div className="mode-picker-label">{t.chooseMode}</div>
            <button type="button" className={`mode-option ${mode === 'grouped' ? 'active' : ''}`} onClick={() => setMode('grouped')}>
              <strong>{t.groupedMode}</strong>
              <span>{t.groupedDesc}</span>
            </button>
            <button type="button" className={`mode-option ${mode === 'place_it' ? 'active' : ''}`} onClick={() => setMode('place_it')}>
              <strong>{t.placeItMode}</strong>
              <span>{t.placeItDesc}</span>
            </button>
          </div>
          <button className="btn btn-primary" onClick={start} disabled={creating}>{creating ? '…' : t.createRoom}</button>
        </div>
        <div className="home-card">
          <h2>{t.participantJoinHint}</h2>
          <form onSubmit={submit} className="stack">
            <div className="field">
              <label>{t.enterRoomCode}</label>
              <input value={code} onChange={(e) => { setCode(e.target.value); setError('') }} placeholder="A7K4P2" autoComplete="off" />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" disabled={joining}>{joining ? '…' : t.join}</button>
          </form>
        </div>
      </div>
    </div>
  )
}

const EN_STOP = new Set('a an the and or but is are was were be been to of in on for with at by from we our it its this that i you they he she as so very can will not no do have has had need more should must'.split(' '))
const AR_STOP = new Set('في من الى إلى على عن مع هذا هذه ذلك التي الذي هو هي هم أنا نحن كل أو و ثم لا لم لن ما يجب كان'.split(' '))

function normalizeArabic(text) {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
}

function tokens(text = '') {
  return normalizeArabic(text.toLowerCase())
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !EN_STOP.has(w) && !AR_STOP.has(w))
}

function commonWords(notes) {
  const counts = new Map()
  notes.forEach((note) => {
    new Set(tokens(note.text)).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1))
  })
  return new Set([...counts].filter(([, count]) => count >= 2).map(([word]) => word))
}

function renderHighlightedText(text, common) {
  if (!common?.size) return text
  return text.split(/(\s+)/).map((part, index) => {
    const normalized = tokens(part)
    return normalized.some((w) => common.has(w))
      ? <mark className="common-word" key={index}>{part}</mark>
      : part
  })
}

function similarity(a, b) {
  const A = new Set(a)
  const B = new Set(b)
  let intersection = 0
  A.forEach((v) => B.has(v) && intersection++)
  const union = A.size + B.size - intersection
  return union === 0 ? 0 : intersection / union
}

function findSimilar(notes) {
  const data = notes.map((n) => ({ id: n.id, tokens: tokens(n.text || '') }))
  const graph = Array.from({ length: data.length }, () => [])
  for (let i = 0; i < data.length; i++) {
    for (let j = i + 1; j < data.length; j++) {
      if (similarity(data[i].tokens, data[j].tokens) >= 0.28) {
        graph[i].push(j)
        graph[j].push(i)
      }
    }
  }
  const visited = Array(data.length).fill(false)
  const groupByNoteId = new Map()
  let groupCount = 0
  for (let i = 0; i < data.length; i++) {
    if (visited[i] || graph[i].length === 0) continue
    const stack = [i]
    const members = []
    visited[i] = true
    while (stack.length) {
      const current = stack.pop()
      members.push(current)
      graph[current].forEach((next) => {
        if (!visited[next]) {
          visited[next] = true
          stack.push(next)
        }
      })
    }
    if (members.length > 1) {
      members.forEach((index) => groupByNoteId.set(data[index].id, groupCount))
      groupCount++
    }
  }
  return { groupByNoteId, groupCount }
}

function layoutNotes(notes, qrVisible) {
  const groups = { yellow: [], pink: [], blue: [], green: [] }
  notes.forEach((n) => (groups[n.color] || groups.yellow).push(n))
  const xStart = qrVisible ? 390 : 24
  const noteW = 190
  const noteH = 150
  const gapX = 24
  const gapY = 22
  const colorIndex = { yellow: 0, pink: 1, blue: 2, green: 3 }
  const positions = []
  ;['yellow', 'pink', 'blue', 'green'].forEach((color) => {
    const x = xStart + colorIndex[color] * (noteW + gapX)
    groups[color].forEach((note, index) => {
      positions.push({ id: note.id, x, y: 24 + index * (noteH + gapY) })
    })
  })
  return positions
}

function needsLayout(notes, qrVisible) {
  const noteW = 190
  const noteH = 150
  const qrW = 370
  const qrH = 360
  const placed = []

  for (const note of notes) {
    const rect = { x: Number(note.x_position) || 0, y: Number(note.y_position) || 0, w: noteW, h: noteH }
    if (qrVisible && rect.x < qrW && rect.y < qrH) return true
    for (const other of placed) {
      const overlap = !(rect.x + rect.w <= other.x || other.x + other.w <= rect.x || rect.y + rect.h <= other.y || other.y + other.h <= rect.y)
      if (overlap) return true
    }
    placed.push(rect)
  }
  return false
}

function StickyNote({ note, onMove, onDelete, simClass, common, normalized = false }) {
  const [dragging, setDragging] = useState(false)
  const ref = useRef(null)
  const drag = useRef(null)
  const pos = useRef({ x: note.x_position, y: note.y_position })

  useEffect(() => {
    if (!drag.current) pos.current = { x: note.x_position, y: note.y_position }
  }, [note.x_position, note.y_position])

  function pointerDown(e) {
    if (e.target.closest('.sticky-note-delete')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: ref.current?.offsetLeft ?? (Number(pos.current.x) || 0),
      originY: ref.current?.offsetTop ?? (Number(pos.current.y) || 0),
    }
    setDragging(true)
  }

  function pointerMove(e) {
    if (!drag.current) return
    const x = Math.max(0, drag.current.originX + e.clientX - drag.current.startX)
    const y = Math.max(0, drag.current.originY + e.clientY - drag.current.startY)
    pos.current = { x, y }
    if (ref.current) {
      ref.current.style.left = x + 'px'
      ref.current.style.top = y + 'px'
    }
  }

  function pointerUp() {
    if (!drag.current) return
    drag.current = null
    setDragging(false)
    onMove(note.id, pos.current.x, pos.current.y)
  }

  return (
    <div
      ref={ref}
      className={`sticky-note ${dragging ? 'dragging' : ''} ${simClass || ''}`}
      data-color={note.color}
      data-lang={note.lang}
      style={{
        left: normalized && Number.isFinite(note.x_ratio) ? `calc(${note.x_ratio * 100}% - 95px)` : note.x_position,
        top: normalized && Number.isFinite(note.y_ratio) ? `calc(${note.y_ratio * 100}% - 75px)` : note.y_position,
        transform: `rotate(${note.rotation || 0}deg)`,
        boxShadow: dragging ? '0 14px 26px rgba(0,0,0,.35)' : '3px 6px 10px rgba(0,0,0,.28)',
      }}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
    >
      <button className="sticky-note-delete" type="button" onClick={() => onDelete(note.id)}>✕</button>
      <div className="sticky-note-text">{renderHighlightedText(note.text, common)}</div>
      <div className="sticky-note-name">{note.participant_name}</div>
    </div>
  )
}

function Facilitator() {
  const { code = '' } = useParams()
  const room = code.toUpperCase()
  const { t } = useLang()
  const [exists, setExists] = useState(null)
  const [roomConfig, setRoomConfig] = useState(null)
  const [connectionError, setConnectionError] = useState('')
  const [notes, setNotes] = useState([])
  const [qrVisible, setQrVisible] = useState(true)
  const [clearOpen, setClearOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [similar, setSimilar] = useState(null)
  const [background, setBackground] = useState('')
  const [promptText, setPromptText] = useState('')
  const [backgroundLibrary, setBackgroundLibrary] = useState([])
  const [backgroundOpen, setBackgroundOpen] = useState(false)
  const [backgroundBusy, setBackgroundBusy] = useState(false)
  const promptTimerRef = useRef(null)
  const containerRef = useRef(null)
  const boardRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    getRoom(room)
      .then((data) => {
        setRoomConfig(data)
        setExists(Boolean(data))
        if (data) {
          setBackground(data.background_data || '')
          setPromptText(data.prompt_text || '')
        }
      })
      .catch((e) => { setConnectionError(e.message); setExists(false) })
  }, [room])

  useEffect(() => {
    if (!exists) return
    return subscribeToRoom(room, (data) => {
      if (!data) return
      setRoomConfig(data)
      setBackground(data.background_data || '')
      setPromptText((current) => current === (roomConfig?.prompt_text || '') ? (data.prompt_text || '') : current)
    })
  }, [room, exists])

  useEffect(() => {
    if (exists) return subscribeToNotes(room, setNotes)
  }, [room, exists])

  useEffect(() => {
    const handler = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const placeIt = roomConfig?.mode === 'place_it'

  useEffect(() => {
    if (placeIt || !exists || notes.length === 0 || !needsLayout(notes, qrVisible)) return
    const next = layoutNotes(notes, qrVisible)
    Promise.all(next.map((p) => moveNote(room, p.id, p.x, p.y))).catch(console.error)
  }, [notes, qrVisible, exists, room, placeIt])

  const joinUrl = useMemo(() => `${window.location.origin}/join/${room}`, [room])
  const common = useMemo(() => commonWords(notes), [notes])

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await containerRef.current?.requestFullscreen?.()
  }

  async function clearAll() {
    await clearRoom(room)
    setNotes([])
    setClearOpen(false)
    setSimilar(null)
  }

  async function refreshBackgroundLibrary() {
    try {
      setBackgroundLibrary(await listBackgrounds())
    } catch (err) {
      console.error(err)
    }
  }

  async function openBackgroundLibrary() {
    setBackgroundOpen(true)
    await refreshBackgroundLibrary()
  }

  async function chooseBackground(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      e.target.value = ''
      return
    }
    setBackgroundBusy(true)
    try {
      const saved = await uploadBackground(file)
      setBackground(saved.public_url)
      await updateRoom(room, { background_data: saved.public_url })
      await refreshBackgroundLibrary()
      setBackgroundOpen(false)
    } catch (err) {
      console.error(err)
      alert(err.message || 'Could not upload background.')
    } finally {
      setBackgroundBusy(false)
      e.target.value = ''
    }
  }

  async function useSavedBackground(item) {
    setBackground(item.public_url)
    await updateRoom(room, { background_data: item.public_url })
    setBackgroundOpen(false)
  }

  async function deleteSavedBackground(item) {
    try {
      await deleteBackgroundAsset(item)
      if (background === item.public_url) {
        setBackground('')
        await updateRoom(room, { background_data: null })
      }
      await refreshBackgroundLibrary()
    } catch (err) {
      console.error(err)
      alert(err.message || 'Could not delete background.')
    }
  }

  async function removeBackground() {
    setBackground('')
    await updateRoom(room, { background_data: null })
  }

  function changePrompt(value) {
    setPromptText(value)
    clearTimeout(promptTimerRef.current)
    promptTimerRef.current = setTimeout(() => {
      updateRoom(room, { prompt_text: value }).catch(console.error)
    }, 500)
  }

  async function takeScreenshot() {
    const board = boardRef.current
    if (!board) return
    try {
      const canvas = await html2canvas(board, {
        backgroundColor: null,
        useCORS: true,
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        width: board.scrollWidth,
        height: board.scrollHeight,
        windowWidth: board.scrollWidth,
        windowHeight: board.scrollHeight,
        scrollX: 0,
        scrollY: 0,
      })
      const link = document.createElement('a')
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `live-sticky-notes-${room}-${stamp}.png`
      link.href = canvas.toDataURL('image/png')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Screenshot failed:', err)
      alert('Could not create screenshot. Please try again.')
    }
  }

  if (exists === null) return <div className="home"><div className="home-card"><p>Loading…</p></div></div>
  if (!exists) return (
    <div className="home">
      <div className="home-card">
        <h2>{connectionError ? 'Connection error' : t.roomNotFound}</h2>
        {connectionError && <p className="error-text">{connectionError}</p>}
      </div>
    </div>
  )

  return (
    <div className="facilitator" ref={containerRef}>
      <div className="toolbar">
        <div className="toolbar-group toolbar-left">
          <div className="room-badge"><span className="label">{t.roomCode}</span> {room}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setQrVisible((v) => !v)}>{qrVisible ? t.hideQr : t.showQr}</button>
          {!placeIt && qrVisible && (
            <div className="qr-popover">
              <QRCodeSVG value={joinUrl} size={168} />
              <div className="code">{room}</div>
              <p>{t.scanToJoin}</p>
            </div>
          )}
        </div>
        <div className="toolbar-group">
          {similar
            ? <button className="btn btn-ghost btn-sm" onClick={() => setSimilar(null)}>{t.resetSimilarity}</button>
            : <button className="btn btn-ghost btn-sm" onClick={() => setSimilar(findSimilar(notes))}>{t.findSimilar}</button>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={chooseBackground} />
          <button className="btn btn-ghost btn-sm" onClick={openBackgroundLibrary}>
            {background ? t.changeBackground : t.background}
          </button>
          {background && <button className="btn btn-ghost btn-sm" onClick={removeBackground}>{t.removeBackground}</button>}
          <button className="btn btn-ghost btn-sm" onClick={takeScreenshot}>{t.screenshot}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setClearOpen(true)}>{t.clearScreen}</button>
          <button className="btn btn-ghost btn-sm" onClick={toggleFullscreen}>{fullscreen ? t.exitFullscreen : t.fullscreen}</button>
          <LanguageSwitch toolbar />
        </div>
      </div>

      {placeIt ? (
        <div className="place-it-shell">
          <aside className="place-it-rail">
            {qrVisible && (
              <div className="qr-card-static">
                <QRCodeSVG value={joinUrl} size={168} />
                <div className="code">{room}</div>
                <p>{t.scanToJoin}</p>
              </div>
            )}
            <div className="prompt-panel">
              <div className="prompt-panel-label">{t.promptPanel}</div>
              <textarea
                value={promptText}
                onChange={(e) => changePrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
              />
            </div>
          </aside>
          <div
            ref={boardRef}
            className="board place-it-board"
            style={background ? {
              backgroundImage: `url(${background})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundColor: '#fff',
            } : { backgroundColor: '#fff', backgroundImage: 'none' }}
          >
            {notes.length === 0 && <div className="board-empty place-it-empty">{t.emptyBoard}</div>}
            {notes.map((note) => {
              let simClass = ''
              if (similar) {
                const group = similar.groupByNoteId.get(note.id)
                simClass = group === undefined ? 'sim-dim' : `sim-group-${group % 6}`
              }
              return (
                <StickyNote
                  key={note.id}
                  note={note}
                  onMove={(id, x, y) => {
                    const board = boardRef.current
                    if (!board) return moveNote(room, id, x, y)
                    const rx = Math.min(1, Math.max(0, (x + 95) / board.clientWidth))
                    const ry = Math.min(1, Math.max(0, (y + 75) / board.clientHeight))
                    return moveNote(room, id, x, y, rx, ry)
                  }}
                  onDelete={(id) => deleteNote(room, id)}
                  simClass={simClass}
                  common={common}
                  normalized
                />
              )
            })}
            {similar && <div className="similarity-banner">{t.similarGroupsFound(similar.groupCount)}</div>}
          </div>
        </div>
      ) : (
        <div
          ref={boardRef}
          className="board"
          style={background ? {
            backgroundImage: `linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.08)), url(${background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          } : undefined}
        >
          {notes.length === 0 && <div className="board-empty">{t.emptyBoard}</div>}
          {notes.map((note) => {
            let simClass = ''
            if (similar) {
              const group = similar.groupByNoteId.get(note.id)
              simClass = group === undefined ? 'sim-dim' : `sim-group-${group % 6}`
            }
            return (
              <StickyNote
                key={note.id}
                note={note}
                onMove={(id, x, y) => moveNote(room, id, x, y)}
                onDelete={(id) => deleteNote(room, id)}
                simClass={simClass}
                common={common}
              />
            )
          })}
          {similar && <div className="similarity-banner">{t.similarGroupsFound(similar.groupCount)}</div>}
        </div>
      )}

      {backgroundOpen && (
        <div className="clear-modal-backdrop" onClick={() => setBackgroundOpen(false)}>
          <div className="background-modal" onClick={(e) => e.stopPropagation()}>
            <div className="background-modal-head">
              <h3>{t.backgroundLibrary}</h3>
              <button className="btn btn-ghost-light btn-sm" onClick={() => setBackgroundOpen(false)}>✕</button>
            </div>
            <button className="btn btn-primary" disabled={backgroundBusy} onClick={() => fileRef.current?.click()}>
              {backgroundBusy ? '…' : t.uploadNewBackground}
            </button>
            <div className="background-section-title">{t.savedBackgrounds}</div>
            {backgroundLibrary.length === 0 ? (
              <div className="background-empty">{t.noSavedBackgrounds}</div>
            ) : (
              <div className="background-grid">
                {backgroundLibrary.map((item) => (
                  <div className="background-card" key={item.id}>
                    <img src={item.public_url} alt={item.name} />
                    <div className="background-card-name" title={item.name}>{item.name}</div>
                    <div className="background-card-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => useSavedBackground(item)}>{t.useBackground}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteSavedBackground(item)}>{t.deleteFromLibrary}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {clearOpen && (
        <div className="clear-modal-backdrop" onClick={() => setClearOpen(false)}>
          <div className="clear-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.clearConfirmTitle}</h3>
            <p>{t.clearConfirmBody}</p>
            <div className="clear-modal-actions">
              <button className="btn btn-ghost-light" onClick={() => setClearOpen(false)}>{t.cancel}</button>
              <button className="btn btn-danger" onClick={clearAll}>{t.clearAll}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const COLORS = [
  { id: 'yellow', en: 'Yellow', ar: 'أصفر', bg: '#FFE066' },
  { id: 'pink', en: 'Pink', ar: 'وردي', bg: '#FFB3C6' },
  { id: 'blue', en: 'Light Blue', ar: 'أزرق فاتح', bg: '#A8D8E8' },
  { id: 'green', en: 'Light Green', ar: 'أخضر فاتح', bg: '#B9E4A6' },
]

function ColorPicker({ value, onChange }) {
  const { t, lang } = useLang()
  return (
    <div>
      <div className="field color-label"><label>{t.chooseColor}</label></div>
      <div className="color-row" role="radiogroup">
        {COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            className="color-swatch"
            style={{ background: color.bg }}
            aria-pressed={value === color.id}
            aria-label={lang === 'ar' ? color.ar : color.en}
            onClick={() => onChange(color.id)}
          />
        ))}
      </div>
    </div>
  )
}

const MAX_CHARS = 150
const participantKey = (room) => 'lsn_participant_' + room

function Participant() {
  const { code = '' } = useParams()
  const room = code.toUpperCase()
  const { t, lang } = useLang()
  const [exists, setExists] = useState(null)
  const [roomConfig, setRoomConfig] = useState(null)
  const [connectionError, setConnectionError] = useState('')
  const [participant, setParticipant] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(participantKey(room))) } catch { return null }
  })
  const [name, setName] = useState('')
  const [notes, setNotes] = useState([])
  const [online, setOnline] = useState(navigator.onLine)
  const [text, setText] = useState('')
  const [color, setColor] = useState('yellow')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [placement, setPlacement] = useState(null)

  useEffect(() => {
    getRoom(room)
      .then((data) => { setRoomConfig(data); setExists(Boolean(data)) })
      .catch((e) => { setConnectionError(e.message); setExists(false) })
  }, [room])

  useEffect(() => {
    if (!exists) return
    return subscribeToRoom(room, (data) => data && setRoomConfig(data))
  }, [room, exists])

  useEffect(() => {
    if (participant && exists) return subscribeToNotes(room, setNotes)
  }, [room, participant, exists])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const myNotes = useMemo(() => notes.filter((n) => n.participant_id === participant?.id), [notes, participant])
  const placeItMode = roomConfig?.mode === 'place_it'

  function choosePlacement(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rx = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    const ry = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    setPlacement({ rx, ry })
  }

  function saveName(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const p = { id: crypto.randomUUID(), name: trimmed }
    sessionStorage.setItem(participantKey(room), JSON.stringify(p))
    setParticipant(p)
  }

  async function post(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_CHARS || posting) return
    setPosting(true)
    setPostError('')
    try {
      await addNote(room, {
        participantId: participant.id,
        participantName: participant.name,
        text: trimmed,
        color,
        lang,
        mode: roomConfig?.mode || 'grouped',
        xRatio: placement?.rx,
        yRatio: placement?.ry,
      })
      setText('')
      if (placeItMode) setPlacement(null)
    } catch (e) {
      setPostError(e.message || 'Failed to post. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  async function saveEdit(id) {
    const trimmed = editText.trim()
    if (!trimmed) return
    await updateParticipantNote(room, id, participant.id, trimmed)
    setEditingId(null)
  }

  if (exists === null) return <div className="home"><div className="home-card"><p>Connecting…</p></div></div>
  if (!exists) return (
    <div className="home">
      <LanguageSwitch />
      <div className="home-card">
        <h2>{connectionError ? 'Connection error' : t.roomNotFound}</h2>
        {connectionError && <p className="error-text">{connectionError}</p>}
      </div>
    </div>
  )

  if (!participant) return (
    <div className="home">
      <LanguageSwitch />
      <div className="home-card narrow">
        <h2>{t.yourName}</h2>
        <form onSubmit={saveName} className="stack">
          <div className="field">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} maxLength={40} />
          </div>
          <button className="btn btn-primary">{t.join}</button>
        </form>
      </div>
    </div>
  )

  const remaining = MAX_CHARS - text.length
  const over = remaining < 0

  return (
    <div className="participant">
      <LanguageSwitch />
      <div className="participant-header">
        <div className="room-tag">
          {t.roomCode}: <strong>{room}</strong>
          <div>{t.postedAs} <strong>{participant.name}</strong></div>
        </div>
        <span className={`status-dot ${online ? '' : 'offline'}`}>{online ? t.connected : t.reconnecting}</span>
      </div>
      <div className="participant-body">
        <form className="composer" onSubmit={post}>
          <h2>{t.writeNote}</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.notePlaceholder} rows={4} />
          <div className={`composer-meta ${over ? 'limit' : ''}`}>
            <span>{remaining} {t.charactersLeft}</span><span>{text.length}/{MAX_CHARS}</span>
          </div>
          <ColorPicker value={color} onChange={setColor} />
          {placeItMode && (
            <div className="placement-section">
              <div className="placement-title">{t.choosePosition}</div>
              <div
                className="placement-picker"
                onClick={choosePlacement}
                style={roomConfig?.background_data ? {
                  backgroundImage: `url(${roomConfig.background_data})`,
                  backgroundSize: 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                } : undefined}
              >
                {!roomConfig?.background_data && <span className="placement-hint">{t.positionHint}</span>}
                {placement && <span className="placement-marker" style={{ left: `${placement.rx * 100}%`, top: `${placement.ry * 100}%` }} />}
              </div>
              <div className="placement-status">{placement ? t.positionSelected : t.positionHint}</div>
            </div>
          )}
          {postError && <div className="post-error">⚠ {postError}</div>}
          <button className="btn btn-primary post-btn" disabled={!text.trim() || over || posting || (placeItMode && !placement)}>{posting ? '…' : t.postNote}</button>
        </form>

        <div className="my-notes">
          <h2>{t.myNotes}</h2>
          {myNotes.length === 0 && <div className="my-notes-empty">{t.noNotesYet}</div>}
          {myNotes.map((note) => {
            const editing = editingId === note.id
            return (
              <div className="my-note-row" data-color={note.color} key={note.id}>
                {editing ? (
                  <div className="my-note-edit">
                    <textarea value={editText} maxLength={MAX_CHARS} onChange={(e) => setEditText(e.target.value)} rows={3} autoFocus />
                    <div className="composer-meta"><span>{MAX_CHARS - editText.length} {t.charactersLeft}</span></div>
                    <div className="row-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(note.id)}>{t.save}</button>
                      <button className="btn btn-text btn-sm" onClick={() => setEditingId(null)}>{t.cancel}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="my-note-text">{note.text}</div>
                    <div className="my-note-actions">
                      <button className="btn btn-ghost-light btn-sm" onClick={() => { setEditingId(note.id); setEditText(note.text) }}>{t.edit}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteParticipantNote(room, note.id, participant.id)}>{t.delete}</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/facilitator/:code" element={<Facilitator />} />
        <Route path="/join/:code" element={<Participant />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </LangProvider>
  )
}
