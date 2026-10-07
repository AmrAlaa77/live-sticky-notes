(() => {
  'use strict'

  const STORAGE_PREFIX = 'lsn_scene_builder_v1_'
  const CUSTOM_IMAGE_LIMIT = 3.5 * 1024 * 1024
  const SELECTOR = '.facilitator'
  let mountedForRoom = null
  let app = null

  const svgData = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  const commonDefs = `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#080808"/><stop offset="1" stop-color="#17100c"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="#ff8a00" stop-opacity=".35"/><stop offset="1" stop-color="#ff8a00" stop-opacity="0"/></radialGradient>
      <filter id="orangeGlow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="soft"><feGaussianBlur stdDeviation="24"/></filter>
    </defs>`

  const TEMPLATES = [
    {
      id: 'advantages-disadvantages',
      name: 'Advantages vs Disadvantages',
      background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${commonDefs}<rect width="1600" height="900" fill="url(#bg)"/><ellipse cx="800" cy="830" rx="720" ry="180" fill="#ff6a00" opacity=".16" filter="url(#soft)"/><g stroke="#ff7a00" fill="#0f0f10" fill-opacity=".84"><rect x="145" y="225" width="1310" height="575" rx="28" stroke-width="3"/><line x1="800" y1="225" x2="800" y2="800" stroke-width="2"/><line x1="145" y1="335" x2="1455" y2="335" stroke-width="2"/><line x1="145" y1="430" x2="1455" y2="430" opacity=".45"/><line x1="145" y1="525" x2="1455" y2="525" opacity=".45"/><line x1="145" y1="620" x2="1455" y2="620" opacity=".45"/><line x1="145" y1="715" x2="1455" y2="715" opacity=".45"/></g><g stroke="#ff7a00" stroke-width="5" filter="url(#orangeGlow)"><path d="M60 660 L140 480"/><path d="M1540 660 L1460 480"/><line x1="95" y1="610" x2="95" y2="760"/><line x1="1505" y1="610" x2="1505" y2="760"/></g><ellipse cx="810" cy="185" rx="360" ry="50" fill="url(#glow)"/></svg>`),
      defaults: [
        { text: 'Comparison Table', x: 50, y: 10, fontSize: 54, bold: true, align: 'center', color: '#ffffff' },
        { text: 'Advantages', x: 30, y: 27, fontSize: 36, bold: true, align: 'center', color: '#ff9a1f' },
        { text: 'Disadvantages', x: 70, y: 27, fontSize: 36, bold: true, align: 'center', color: '#ffffff' },
      ],
    },
    {
      id: 'facts-assumptions',
      name: 'Facts vs Assumptions',
      background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${commonDefs}<rect width="1600" height="900" fill="#070707"/><g opacity=".58"><path d="M0 80h1600M0 820h1600" stroke="#ff6a00" stroke-width="9"/><path d="M35 0v900M1565 0v900" stroke="#8b3f00" stroke-width="3"/></g><g fill="#0b0b0c" stroke="#ff7a00"><rect x="170" y="170" width="1260" height="620" rx="24" stroke-width="4"/><line x1="800" y1="170" x2="800" y2="790" stroke-width="3"/><line x1="170" y1="285" x2="1430" y2="285" stroke-width="3"/><line x1="170" y1="385" x2="1430" y2="385" opacity=".75"/><line x1="170" y1="485" x2="1430" y2="485" opacity=".75"/><line x1="170" y1="585" x2="1430" y2="585" opacity=".75"/><line x1="170" y1="685" x2="1430" y2="685" opacity=".75"/></g><g fill="#ff6a00" opacity=".14" filter="url(#soft)"><circle cx="210" cy="110" r="180"/><circle cx="1390" cy="110" r="180"/><circle cx="220" cy="820" r="160"/><circle cx="1380" cy="820" r="160"/></g></svg>`),
      defaults: [
        { text: 'Comparison Table', x: 50, y: 7, fontSize: 50, bold: true, align: 'center', color: '#ffffff' },
        { text: 'Facts', x: 31, y: 22, fontSize: 36, bold: true, align: 'center', color: '#ff9a1f' },
        { text: 'Assumptions', x: 69, y: 22, fontSize: 36, bold: true, align: 'center', color: '#ffffff' },
      ],
    },
    {
      id: 'reasons-excuses',
      name: 'Reasons vs Excuses',
      background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${commonDefs}<rect width="1600" height="900" fill="#050505"/><g fill="#ff4b00" opacity=".2" filter="url(#soft)"><circle cx="120" cy="510" r="240"/><circle cx="1480" cy="510" r="240"/></g><g fill="#0a0a0a" fill-opacity=".9" stroke="#ff7a00" filter="url(#orangeGlow)"><rect x="120" y="170" width="1360" height="620" rx="20" stroke-width="3"/><line x1="800" y1="170" x2="800" y2="790" stroke-width="2"/><line x1="120" y1="285" x2="1480" y2="285" stroke-width="2"/><line x1="120" y1="385" x2="1480" y2="385" opacity=".7"/><line x1="120" y1="485" x2="1480" y2="485" opacity=".7"/><line x1="120" y1="585" x2="1480" y2="585" opacity=".7"/><line x1="120" y1="685" x2="1480" y2="685" opacity=".7"/></g><path d="M0 830 Q360 760 800 835 T1600 830" stroke="#ff6a00" stroke-width="6" fill="none" opacity=".65"/></svg>`),
      defaults: [
        { text: 'Comparison Table', x: 50, y: 7, fontSize: 50, bold: true, align: 'center', color: '#ffffff' },
        { text: 'Reasons', x: 31, y: 22, fontSize: 36, bold: true, align: 'center', color: '#ff9a1f' },
        { text: 'Excuses', x: 69, y: 22, fontSize: 36, bold: true, align: 'center', color: '#ffffff' },
      ],
    },
    {
      id: 'green-red-split',
      name: 'Green vs Red Split',
      background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#07190c"/><stop offset=".55" stop-color="#008b2f"/><stop offset="1" stop-color="#04250d"/></linearGradient><linearGradient id="r" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#260000"/><stop offset=".55" stop-color="#d00000"/><stop offset="1" stop-color="#340000"/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="14"/></filter></defs><rect width="800" height="900" fill="url(#g)"/><rect x="800" width="800" height="900" fill="url(#r)"/><line x1="800" y1="0" x2="800" y2="900" stroke="#f4f4f4" stroke-opacity=".35" stroke-width="3"/><g opacity=".33" fill="none" stroke="#fff" stroke-width="4"><path d="M-80 760 L330 350 L650 30"/><path d="M100 900 L520 480 L760 240"/><path d="M1680 760 L1270 350 L950 30"/><path d="M1500 900 L1080 480 L840 240"/></g><rect x="30" y="30" width="720" height="120" rx="20" fill="#fff" fill-opacity=".08" stroke="#b9ffc7"/><rect x="850" y="30" width="720" height="120" rx="20" fill="#fff" fill-opacity=".08" stroke="#ffc0c0"/></svg>`),
      defaults: [
        { text: 'LEFT TITLE', x: 25, y: 8, fontSize: 42, bold: true, align: 'center', color: '#ffffff' },
        { text: 'RIGHT TITLE', x: 75, y: 8, fontSize: 42, bold: true, align: 'center', color: '#ffffff' },
      ],
    },
    {
      id: 'ego-states',
      name: 'Ego States',
      background: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">${commonDefs}<rect width="1600" height="900" fill="#070504"/><g fill="#ff6a00" opacity=".16" filter="url(#soft)"><circle cx="175" cy="690" r="260"/><circle cx="1425" cy="690" r="260"/><circle cx="800" cy="830" r="180"/></g><g fill="none" stroke="#ff8a1f" stroke-width="5" filter="url(#orangeGlow)"><circle cx="610" cy="440" r="225"/><circle cx="990" cy="440" r="225"/><circle cx="800" cy="635" r="225"/></g><path d="M420 120 H1180" stroke="#ff7a00" stroke-width="2" opacity=".7"/><path d="M420 135 H1180" stroke="#ff7a00" opacity=".35"/></svg>`),
      defaults: [
        { text: 'Ego States', x: 50, y: 7, fontSize: 56, bold: true, align: 'center', color: '#ffb063' },
        { text: 'Parent State', x: 37, y: 30, fontSize: 26, bold: false, align: 'center', color: '#ffffff' },
        { text: 'Adult State', x: 63, y: 30, fontSize: 26, bold: false, align: 'center', color: '#ffffff' },
        { text: 'Child State', x: 50, y: 73, fontSize: 26, bold: false, align: 'center', color: '#ffffff' },
      ],
    },
    { id: 'superstar', name: 'Superstar', background: null, defaults: [] },
    { id: 'custom', name: 'Custom Upload', background: null, defaults: [] },
  ]

  const templateById = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
  const cloneDefaults = (template) => (template.defaults || []).map((item, i) => ({
    id: `text-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    text: item.text,
    x: item.x,
    y: item.y,
    fontSize: item.fontSize || 34,
    color: item.color || '#ffffff',
    bold: Boolean(item.bold),
    align: item.align || 'center',
    locked: false,
    zIndex: i + 1,
  }))

  function roomFromPath() {
    const match = location.pathname.match(/^\/facilitator\/([^/?#]+)/i)
    return match ? match[1].toUpperCase() : null
  }

  function safeParse(value, fallback) {
    try { return JSON.parse(value) } catch { return fallback }
  }

  function loadSaved(room) {
    return safeParse(localStorage.getItem(STORAGE_PREFIX + room), null)
  }

  function saveState(room, state) {
    const payload = {
      templateId: state.templateId,
      texts: state.texts,
      customBackground: state.customBackground || null,
      updatedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_PREFIX + room, JSON.stringify(payload))
  }

  function makeButton(label, title, onClick, extra = '') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `sb-btn ${extra}`.trim()
    button.textContent = label
    if (title) button.title = title
    button.addEventListener('click', onClick)
    return button
  }

  function makeField(label, control) {
    const wrap = document.createElement('label')
    wrap.className = 'sb-field'
    const span = document.createElement('span')
    span.textContent = label
    wrap.append(span, control)
    return wrap
  }

  function mount() {
    const room = roomFromPath()
    const facilitator = document.querySelector(SELECTOR)
    if (!room || !facilitator || !facilitator.querySelector('.superstar-stage')) return
    if (mountedForRoom === room && app?.facilitator?.isConnected) return
    unmount()

    const stage = facilitator.querySelector('.superstar-stage')
    const toolbar = facilitator.querySelector('.toolbar')
    if (!stage || !toolbar) return

    const saved = loadSaved(room)
    const initialTemplateId = saved?.templateId || 'superstar'
    const state = {
      room,
      facilitator,
      stage,
      toolbar,
      templateId: initialTemplateId,
      texts: Array.isArray(saved?.texts) ? saved.texts : cloneDefaults(templateById(initialTemplateId)),
      customBackground: saved?.customBackground || null,
      selectedId: null,
      editing: false,
      dirty: false,
    }

    const toggleButton = makeButton('Scene Builder', 'Open Template / Scene Builder', () => {
      state.panel.classList.toggle('is-open')
      toggleButton.classList.toggle('is-active', state.panel.classList.contains('is-open'))
    }, 'sb-toolbar-button')
    const toolbarGroup = toolbar.querySelector('.toolbar-group:last-child') || toolbar
    toolbarGroup.insertBefore(toggleButton, toolbarGroup.firstChild)

    const panel = document.createElement('div')
    panel.className = 'sb-panel'
    state.panel = panel

    const top = document.createElement('div')
    top.className = 'sb-panel-top'
    const heading = document.createElement('div')
    heading.className = 'sb-heading'
    heading.innerHTML = '<strong>Template / Scene Builder</strong><span>Edit directly on the presentation canvas</span>'
    const close = makeButton('×', 'Close', () => { panel.classList.remove('is-open'); toggleButton.classList.remove('is-active') }, 'sb-close')
    top.append(heading, close)

    const templateSelect = document.createElement('select')
    templateSelect.className = 'sb-select'
    TEMPLATES.forEach((template) => {
      const option = document.createElement('option')
      option.value = template.id
      option.textContent = template.name
      templateSelect.append(option)
    })
    templateSelect.value = state.templateId
    state.templateSelect = templateSelect

    const customInput = document.createElement('input')
    customInput.type = 'file'
    customInput.accept = 'image/*'
    customInput.className = 'sb-hidden-input'

    const row1 = document.createElement('div')
    row1.className = 'sb-row sb-row-main'
    row1.append(makeField('Template', templateSelect))
    row1.append(makeButton('Upload Background', 'Upload a custom background', () => customInput.click()))
    row1.append(makeButton('+ Add Text', 'Add editable text', () => addText(state)))

    const row2 = document.createElement('div')
    row2.className = 'sb-row'
    row2.append(
      makeButton('Delete', 'Delete selected text', () => deleteSelected(state)),
      makeButton('Duplicate', 'Duplicate selected text', () => duplicateSelected(state)),
      makeButton('Lock', 'Lock / unlock selected text', () => toggleLock(state), 'sb-lock-btn'),
      makeButton('Bring Forward', 'Bring selected text forward', () => moveLayer(state, 1)),
      makeButton('Send Backward', 'Send selected text backward', () => moveLayer(state, -1)),
    )

    const fontSize = document.createElement('input')
    fontSize.type = 'number'; fontSize.min = '12'; fontSize.max = '140'; fontSize.step = '1'; fontSize.value = '34'; fontSize.className = 'sb-number'
    const color = document.createElement('input')
    color.type = 'color'; color.value = '#ffffff'; color.className = 'sb-color'
    const bold = document.createElement('button')
    bold.type = 'button'; bold.className = 'sb-style-toggle'; bold.textContent = 'B'; bold.title = 'Bold'
    const align = document.createElement('select')
    align.className = 'sb-select sb-align'
    ;['left', 'center', 'right'].forEach((value) => { const o = document.createElement('option'); o.value = value; o.textContent = value[0].toUpperCase() + value.slice(1); align.append(o) })

    const row3 = document.createElement('div')
    row3.className = 'sb-row sb-style-row'
    row3.append(makeField('Size', fontSize), makeField('Color', color), bold, makeField('Align', align))

    const status = document.createElement('div')
    status.className = 'sb-status'
    status.textContent = saved ? 'Saved layout restored for this room.' : 'Ready.'
    state.status = status

    const row4 = document.createElement('div')
    row4.className = 'sb-row sb-actions'
    row4.append(
      makeButton('Save Layout', 'Save this room layout on this computer', () => {
        try { saveState(room, state); state.dirty = false; setStatus(state, 'Layout saved for this room.') } catch (e) { setStatus(state, 'Could not save layout. Try a smaller custom image.', true) }
      }, 'sb-primary'),
      makeButton('Reset Layout', 'Reset this template', () => resetLayout(state)),
    )

    panel.append(top, row1, row2, row3, row4, status, customInput)
    toolbar.insertAdjacentElement('afterend', panel)

    const scene = document.createElement('div')
    scene.className = 'sb-scene'
    const background = document.createElement('div')
    background.className = 'sb-scene-bg'
    const layer = document.createElement('div')
    layer.className = 'sb-text-layer'
    scene.append(background, layer)
    stage.append(scene)
    state.scene = scene; state.background = background; state.layer = layer

    templateSelect.addEventListener('change', () => switchTemplate(state, templateSelect.value))
    customInput.addEventListener('change', (event) => handleCustomUpload(state, event))
    fontSize.addEventListener('input', () => updateSelected(state, { fontSize: Number(fontSize.value) || 34 }))
    color.addEventListener('input', () => updateSelected(state, { color: color.value }))
    bold.addEventListener('click', () => {
      const item = selectedItem(state); if (!item) return
      updateSelected(state, { bold: !item.bold })
    })
    align.addEventListener('change', () => updateSelected(state, { align: align.value }))
    state.controls = { fontSize, color, bold, align }

    const outside = (e) => {
      if (!state.scene.contains(e.target) && !state.panel.contains(e.target)) selectText(state, null)
    }
    facilitator.addEventListener('pointerdown', outside)
    state.outside = outside

    applyTemplate(state)
    renderTexts(state)
    mountedForRoom = room
    app = state
  }

  function unmount() {
    if (!app) { mountedForRoom = null; return }
    app.facilitator?.removeEventListener('pointerdown', app.outside)
    app.panel?.remove()
    app.scene?.remove()
    app.toolbar?.querySelector('.sb-toolbar-button')?.remove()
    app.facilitator?.classList.remove('sb-template-mode', 'sb-superstar-overlay-mode')
    app = null
    mountedForRoom = null
  }

  function setStatus(state, message, error = false) {
    state.status.textContent = message
    state.status.classList.toggle('is-error', error)
    clearTimeout(state.statusTimer)
    state.statusTimer = setTimeout(() => { if (state.status) state.status.textContent = state.dirty ? 'Unsaved changes.' : 'Ready.' }, 3200)
  }

  function switchTemplate(state, id) {
    const template = templateById(id)
    state.templateId = template.id
    state.selectedId = null
    if (template.id !== 'custom' || !state.customBackground) state.texts = cloneDefaults(template)
    applyTemplate(state)
    renderTexts(state)
    state.dirty = true
    setStatus(state, template.id === 'custom' && !state.customBackground ? 'Upload an image for the Custom template.' : `${template.name} loaded.`)
  }

  function applyTemplate(state) {
    const template = templateById(state.templateId)
    const isSuperstar = template.id === 'superstar'
    state.facilitator.classList.toggle('sb-template-mode', !isSuperstar)
    state.facilitator.classList.toggle('sb-superstar-overlay-mode', isSuperstar)
    state.scene.classList.toggle('is-superstar-overlay', isSuperstar)
    if (template.id === 'custom') {
      state.background.style.backgroundImage = state.customBackground ? `url("${state.customBackground}")` : 'linear-gradient(135deg,#151515,#050505)'
    } else if (template.background) {
      state.background.style.backgroundImage = `url("${template.background}")`
    } else {
      state.background.style.backgroundImage = 'none'
    }
  }

  function handleCustomUpload(state, event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > CUSTOM_IMAGE_LIMIT) {
      setStatus(state, 'Custom image must be 3.5 MB or smaller so it can be saved locally.', true)
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      state.customBackground = reader.result
      state.templateId = 'custom'
      state.templateSelect.value = 'custom'
      state.texts = []
      applyTemplate(state)
      renderTexts(state)
      state.dirty = true
      setStatus(state, 'Custom background loaded. Add text, then Save Layout.')
    }
    reader.onerror = () => setStatus(state, 'Could not read that image.', true)
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function addText(state) {
    const z = state.texts.reduce((m, item) => Math.max(m, item.zIndex || 0), 0) + 1
    const item = {
      id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: 'Double-click to edit', x: 50, y: 50, fontSize: 34, color: '#ffffff', bold: true, align: 'center', locked: false, zIndex: z,
    }
    state.texts.push(item)
    renderTexts(state)
    selectText(state, item.id)
    state.dirty = true
  }

  function deleteSelected(state) {
    if (!state.selectedId) return
    state.texts = state.texts.filter((item) => item.id !== state.selectedId)
    state.selectedId = null
    renderTexts(state)
    state.dirty = true
  }

  function duplicateSelected(state) {
    const item = selectedItem(state); if (!item) return
    const copy = { ...item, id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, x: Math.min(95, item.x + 3), y: Math.min(95, item.y + 4), locked: false, zIndex: (item.zIndex || 1) + 1 }
    state.texts.push(copy)
    renderTexts(state)
    selectText(state, copy.id)
    state.dirty = true
  }

  function toggleLock(state) {
    const item = selectedItem(state); if (!item) return
    item.locked = !item.locked
    renderTexts(state)
    selectText(state, item.id)
    state.dirty = true
    setStatus(state, item.locked ? 'Text locked.' : 'Text unlocked.')
  }

  function moveLayer(state, amount) {
    const item = selectedItem(state); if (!item) return
    item.zIndex = Math.max(1, (item.zIndex || 1) + amount)
    renderTexts(state); selectText(state, item.id); state.dirty = true
  }

  function selectedItem(state) { return state.texts.find((item) => item.id === state.selectedId) || null }

  function updateSelected(state, patch) {
    const item = selectedItem(state); if (!item) return
    Object.assign(item, patch)
    state.dirty = true
    renderTexts(state)
    selectText(state, item.id)
  }

  function resetLayout(state) {
    const template = templateById(state.templateId)
    state.selectedId = null
    if (template.id === 'custom') {
      state.texts = []
    } else {
      state.texts = cloneDefaults(template)
    }
    renderTexts(state)
    state.dirty = true
    setStatus(state, 'Layout reset. Save if you want to keep this reset.')
  }

  function selectText(state, id) {
    state.selectedId = id
    state.layer.querySelectorAll('.sb-text').forEach((el) => el.classList.toggle('is-selected', el.dataset.id === id))
    const item = selectedItem(state)
    if (!item) return
    state.controls.fontSize.value = item.fontSize || 34
    state.controls.color.value = item.color || '#ffffff'
    state.controls.bold.classList.toggle('is-active', Boolean(item.bold))
    state.controls.align.value = item.align || 'center'
    state.panel.querySelector('.sb-lock-btn').textContent = item.locked ? 'Unlock' : 'Lock'
  }

  function renderTexts(state) {
    state.layer.innerHTML = ''
    state.texts.forEach((item) => {
      const el = document.createElement('div')
      el.className = `sb-text${item.locked ? ' is-locked' : ''}`
      el.dataset.id = item.id
      el.textContent = item.text
      el.style.left = `${item.x}%`
      el.style.top = `${item.y}%`
      el.style.fontSize = `${item.fontSize || 34}px`
      el.style.color = item.color || '#ffffff'
      el.style.fontWeight = item.bold ? '800' : '500'
      el.style.textAlign = item.align || 'center'
      el.style.zIndex = String(item.zIndex || 1)
      el.addEventListener('pointerdown', (e) => startDrag(state, item, el, e))
      el.addEventListener('dblclick', (e) => startEditing(state, item, el, e))
      el.addEventListener('click', (e) => { e.stopPropagation(); selectText(state, item.id) })
      state.layer.append(el)
    })
    selectText(state, state.selectedId)
  }

  function startEditing(state, item, el, event) {
    event.stopPropagation()
    if (item.locked) return
    selectText(state, item.id)
    state.editing = true
    el.contentEditable = 'true'
    el.classList.add('is-editing')
    el.focus()
    const range = document.createRange(); range.selectNodeContents(el); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range)
    const finish = () => {
      if (!el.isConnected) return
      item.text = el.innerText.trim() || 'Text'
      el.contentEditable = 'false'
      el.classList.remove('is-editing')
      state.editing = false
      state.dirty = true
      renderTexts(state)
      selectText(state, item.id)
    }
    el.addEventListener('blur', finish, { once: true })
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); el.blur() }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); el.blur() }
    })
  }

  function startDrag(state, item, el, event) {
    if (state.editing || item.locked || event.detail > 1) return
    event.preventDefault(); event.stopPropagation(); selectText(state, item.id)
    const rect = state.scene.getBoundingClientRect()
    const start = { x: event.clientX, y: event.clientY, px: item.x, py: item.y, pointerId: event.pointerId }
    el.setPointerCapture?.(event.pointerId)
    el.classList.add('is-dragging')
    const move = (e) => {
      if (e.pointerId !== start.pointerId) return
      item.x = Math.min(98, Math.max(2, start.px + ((e.clientX - start.x) / rect.width) * 100))
      item.y = Math.min(96, Math.max(4, start.py + ((e.clientY - start.y) / rect.height) * 100))
      el.style.left = `${item.x}%`; el.style.top = `${item.y}%`; state.dirty = true
    }
    const up = (e) => {
      if (e.pointerId !== start.pointerId) return
      el.classList.remove('is-dragging')
      el.releasePointerCapture?.(e.pointerId)
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up)
  }

  const observer = new MutationObserver(() => {
    const room = roomFromPath()
    if (!room) { if (app) unmount(); return }
    if (room !== mountedForRoom || !app?.facilitator?.isConnected) mount()
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
  window.addEventListener('popstate', () => setTimeout(mount, 0))
  setTimeout(mount, 0)
  setInterval(() => { if (roomFromPath() && (!app || !app.facilitator?.isConnected)) mount() }, 1500)
})()
