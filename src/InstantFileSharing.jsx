import React, { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from './supabase'
import './instant-file-sharing.css'

const API_FILE_LIMIT=50*1000*1000
const MB=1024*1024
const TITLE='INSTANT FILE SHARING'
const fmtSize=b=>b<MB?Math.ceil(b/1024)+' KB':(b/MB).toFixed(1)+' MB'
const link=(type,token)=>window.location.origin+'/instant/'+type+'/'+encodeURIComponent(token)

async function api(action,body={}){
  const {data,error}=await supabase.functions.invoke('instant-share',{body:{action,...body}})
  if(error){
    let msg=error.message
    try{if(error.context && typeof error.context.json==='function')msg=(await error.context.json()).error||msg}catch{}
    throw new Error(msg)
  }
  if(data?.error)throw new Error(data.error)
  return data
}
async function sendFiles(files,base,progress){
  for(let i=0;i<files.length;i++){
    const file=files[i]
    if(file.size>API_FILE_LIMIT)throw new Error('Each file must be 50 MB or smaller.')
    progress('Uploading '+(i+1)+' of '+files.length+': '+file.name)
    const signed=await api('begin_file',{
      ...base,file_name:file.name,file_size:file.size,
      mime_type:file.type||'application/octet-stream'
    })
    // Use the standard Supabase signed-upload endpoint. The former TUS route
    // rejected signed tokens with "Invalid Compact JWS" in hosted Storage.
    // This method uses the token exactly as returned by createSignedUploadUrl.
    const {error}=await supabase.storage.from(signed.bucket).uploadToSignedUrl(
      signed.path,signed.upload_signature,file,{
        contentType:file.type||'application/octet-stream',
        cacheControl:'3600',
      }
    )
    if(error)throw new Error('Upload failed for '+file.name+': '+error.message)
    progress('Verifying file '+(i+1)+' of '+files.length)
    await api('complete_file',{...base,item_id:signed.item_id})
    progress('Uploaded '+(i+1)+' of '+files.length)
  }
}
function Copy({value}){
 const [ok,setOk]=useState(false)
 return <button className="ifs-mini" type="button" onClick={async()=>{
   try{await navigator.clipboard.writeText(value);setOk(true);setTimeout(()=>setOk(false),1700)}
   catch{window.prompt('Copy link:',value)}
 }}>{ok?'Copied':'Copy link'}</button>
}
function QRPanel({title,url,subtitle,resizeHandle,height}){
 return <section className="ifs-panel ifs-qr" style={{height}}>
   <h2>{title}</h2><p>{subtitle}</p>
   <div className="ifs-qr-white"><QRCodeSVG value={url} size={165} level="H" marginSize={2}/></div>
   <Copy value={url}/>
   {resizeHandle?.()}
 </section>
}
function Item({item,trainer,onDelete}){
 const [expanded,setExpanded]=useState(false)
 return <article className="ifs-item">
   <div className="ifs-item-top"><div className="ifs-item-meta">
     <strong>{item.kind==='file'?item.file_name:'Text submission'}</strong>
     {trainer && item.participant_name && <span>From {item.participant_name}</span>}
     <small>{item.kind==='file'?fmtSize(item.file_size):'Text'} · {new Date(item.created_at).toLocaleString()}</small>
   </div><div className="ifs-item-buttons">
     {item.kind==='file'?(
       item.status==='ready'?<a href={item.download_url} className="ifs-mini" download={item.file_name}>Download</a>:<small>Uploading</small>
     ):<button className="ifs-mini" type="button" onClick={()=>setExpanded(p=>!p)}>{expanded?'Hide':'View'}</button>}
     {trainer&&<button type="button" className="ifs-mini ifs-delete" onClick={()=>onDelete(item)}>Delete</button>}
   </div></div>
   {expanded&&item.kind==='text'&&<p className="ifs-item-text">{item.content}</p>}
   {item.preview_url&&<a href={item.download_url} download={item.file_name}><img className="ifs-preview" src={item.preview_url} alt={'Preview '+item.file_name}/></a>}
 </article>
}

const DEFAULT_PANEL_LAYOUT={widths:[26,24,26,24],heights:[335,335,335,335]}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
function savedPanelLayout(workshopId){
  if(!workshopId)return DEFAULT_PANEL_LAYOUT
  try{
    const entry=JSON.parse(localStorage.getItem('ifs-panel-layout-'+workshopId)||'null')
    if(Array.isArray(entry?.widths)&&entry.widths.length===4
       &&Array.isArray(entry.heights)&&entry.heights.length===4
       &&entry.widths.every(v=>Number.isFinite(v)&&v>=14&&v<=52)
       &&entry.heights.every(v=>Number.isFinite(v)&&v>=260&&v<=960)
       &&Math.abs(entry.widths.reduce((a,b)=>a+b,0)-100)<.2)return entry
  }catch{}
  return DEFAULT_PANEL_LAYOUT
}

function Trainer(){
 const [workshops,setWorkshops]=useState([])
 const [selected,setSelected]=useState(null)
 const screenRef=useRef(null)
 const [fullscreen,setFullscreen]=useState(false)
 useEffect(()=>{
   const sync=()=>setFullscreen(document.fullscreenElement===screenRef.current)
   document.addEventListener('fullscreenchange',sync)
   return ()=>document.removeEventListener('fullscreenchange',sync)
 },[])
 async function toggleFullscreen(){
   try {
     if(document.fullscreenElement===screenRef.current)await document.exitFullscreen()
     else await screenRef.current?.requestFullscreen()
   }catch(err){setError('Fullscreen unavailable: '+(err.message||String(err)))}
 }
 const [layout,setLayout]=useState(DEFAULT_PANEL_LAYOUT)
 const resizing=useRef(null)
 const layoutRef=useRef(DEFAULT_PANEL_LAYOUT)
 const panelsRef=useRef(null)
 useEffect(()=>{const saved=savedPanelLayout(selected?.id);setLayout(saved);layoutRef.current=saved},[selected?.id])
 const [title,setTitle]=useState('')
 const [items,setItems]=useState([])
 const [shareText,setShareText]=useState('')
 const [files,setFiles]=useState([])
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const [progress,setProgress]=useState('')
 const refresh=useCallback(async()=>{const data=await api('workshops');setWorkshops(data.workshops||[]);return data.workshops||[]},[])
 const load=useCallback(async()=>{
   if(!selected)return
   const data=await api('trainer_feed',{workshop_id:selected.id})
   setItems(data.items||[])
 },[selected])
 useEffect(()=>{refresh().catch(e=>setError(e.message))},[refresh])
 useEffect(()=>{
   if(!selected)return
   load().catch(e=>setError(e.message))
   const timer=setInterval(()=>load().catch(console.error),6000)
   return ()=>clearInterval(timer)
 },[selected,load])
 async function run(fn){
   if(busy)return
   setBusy(true);setError('');setNotice('')
   try{await fn()}catch(e){setError(e.message||String(e))}finally{setBusy(false)}
 }
 const create=()=>run(async()=>{
   const res=await api('create_workshop',{title:title.trim()})
   await refresh();setSelected(res.workshop);setTitle('')
   setNotice('Workshop created. Both QR codes remain the same for this workshop.')
 })
 const send=()=>run(async()=>{
   if(!selected)throw new Error('Select a workshop first.')
   if(!shareText.trim()&&!files.length)throw new Error('Add text or files first.')
   const base={direction:'outgoing',workshop_id:selected.id}
   if(shareText.trim())await api('add_text',{...base,content:shareText.trim()})
   if(files.length)await sendFiles(files,base,setProgress)
   setShareText('');setFiles([]);setProgress('')
   setNotice('Shared instantly with participants.')
   await load()
 })
 function resizeStart(event,index,axis='both'){
   if(event.button!==0)return
   event.preventDefault()
   event.stopPropagation()
   event.currentTarget.setPointerCapture(event.pointerId)
   resizing.current={
     id:index,x:event.clientX,y:event.clientY,
     original:layoutRef.current,
     axis,
     panelWidth:panelsRef.current?.clientWidth||1200,
   }
 }
 function resizeMove(event){
   if(!resizing.current)return
   event.stopPropagation()
   event.preventDefault()
   const {id,x,y,original,panelWidth,axis}=resizing.current
   const widths=original.widths.slice()
   const deltaX=axis==='vertical'?0:(event.clientX-x)/Math.max(300,panelWidth)*100
   const partner=id===3?2:id+1
   const oldWidth=widths[id],oldNeighbor=widths[partner]
   const d=clamp(deltaX,16-oldWidth,oldNeighbor-16)
   widths[id]=Math.round((oldWidth+d)*100)/100
   widths[partner]=Math.round((oldNeighbor-d)*100)/100
   // Resize height of just this panel; horizontal drag changes one shared border.
   const heights=original.heights.slice()
   heights[id]=clamp(Math.round(original.heights[id]+event.clientY-y),260,960)
   const next={widths,heights}
   layoutRef.current=next
   setLayout(next)
 }
 function resizeFinish(event){
   if(!resizing.current)return
   event.stopPropagation()
   event.preventDefault()
   resizing.current=null
   if(selected){
     try{localStorage.setItem('ifs-panel-layout-'+selected.id,JSON.stringify(layoutRef.current))}catch{}
   }
 }
 function panelStyle(index){return {height:layout.heights[index]+'px'}}
 function resizeHandle(index){
   return <>
     <button
       type="button"
       className="ifs-height-handle"
       aria-label={'Resize panel '+(index+1)+' vertically'}
       title="Drag up or down to change panel height"
       onPointerDown={event=>resizeStart(event,index,'vertical')}
       onPointerMove={resizeMove}
       onPointerUp={resizeFinish}
       onPointerCancel={resizeFinish}
     >↕ Height</button>
     <button
       type="button"
       className="ifs-resize-handle"
       aria-label={'Resize panel '+(index+1)+' width and height'}
       title="Drag diagonally to resize width and height"
       onPointerDown={event=>resizeStart(event,index,'both')}
       onPointerMove={resizeMove}
       onPointerUp={resizeFinish}
       onPointerCancel={resizeFinish}
     >⤡</button>
   </>
 }
 function resetPanelSizes(){
   setLayout(DEFAULT_PANEL_LAYOUT)
   layoutRef.current=DEFAULT_PANEL_LAYOUT
   if(selected)try{localStorage.removeItem('ifs-panel-layout-'+selected.id)}catch{}
 }

 const remove=item=>{
   if(!window.confirm('Delete this '+(item.kind==='file'?'file':'text')+' permanently?'))return
   run(async()=>{await api('delete_item',{workshop_id:selected.id,item_id:item.id});await load()})
 }
 const removeWorkshop=w=>{
   if(!window.confirm('Delete workshop "'+w.title+'" and all its files and submissions permanently?'))return
   run(async()=>{await api('delete_workshop',{workshop_id:w.id});if(selected?.id===w.id){setSelected(null);setItems([])}await refresh()})
 }
 return <div className="ifs-screen" ref={screenRef}>
   <header className="ifs-top"><a href="/">← Live Sticky Notes</a><strong>{TITLE}</strong></header>
   {!selected?<main className="ifs-choose">
     <h1>Choose or create a workshop</h1>
     <form onSubmit={e=>{e.preventDefault();create()}} className="ifs-choose-form">
       <input placeholder="Workshop name" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={120}/>
       <button disabled={busy||!title.trim()}>Create workshop</button>
     </form>
     {workshops.map(w=><div className="ifs-workshop-row" key={w.id}>
       <button type="button" className="ifs-open" onClick={()=>{setSelected(w);setError('')}}>{w.title}<span>Open →</span></button>
       <button type="button" className="ifs-mini ifs-delete" disabled={busy} onClick={()=>removeWorkshop(w)}>Delete</button>
     </div>)}
     {!workshops.length&&<p>Create your first workshop to generate two permanent QR codes.</p>}
     {error&&<p className="ifs-error" role="alert">{error}</p>}
   </main>:<>
     <div className="ifs-workshop-line">
       <button type="button" onClick={()=>{setSelected(null);setItems([]);setError('')}}>← Workshops</button>
       <strong>{selected.title}</strong><div className="ifs-workshop-actions"><button type="button" className="ifs-fullscreen-button" onClick={toggleFullscreen}>{fullscreen ? "⤡ Exit Fullscreen" : "⛶ Fullscreen"}</button><button type="button" onClick={resetPanelSizes}>Reset panel sizes</button><span>Facilitator</span></div>
     </div>
     <div className="ifs-hero-spacer"/>
     <main className="ifs-four-panels" ref={panelsRef} style={{gridTemplateColumns:layout.widths.map(v=>v+'fr').join(' ')}}>
       <section className="ifs-panel ifs-compose" style={panelStyle(0)}>
         <h2>1. Share with participants</h2><p>Text and files, including multiple attachments</p>
         <textarea value={shareText} maxLength={20000} onChange={e=>setShareText(e.target.value)} placeholder="Paste instructions, links or text here…"/>
         <label className="ifs-filepicker">Choose files (up to 50 MB each)<input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
         {files.length>0&&<small>{files.length} selected: {files.map(f=>f.name).join(', ')}</small>}
         <button className="ifs-primary" disabled={busy} type="button" onClick={send}>{busy?'Sharing…':'Share instantly'}</button>
         {progress&&<small>{progress}</small>}
         <h3>Shared with participants</h3>
         <div className="ifs-feed">{items.filter(i=>i.direction==='outgoing').map(i=><Item key={i.id} item={i} trainer onDelete={remove}/> )}</div>
         {resizeHandle(0)}
       </section>
       <QRPanel title="2. Download QR" subtitle="One QR displays everything you share" url={link('download',selected.download_token)} resizeHandle={()=>resizeHandle(1)} height={layout.heights[1]+'px'}/>
       <section className="ifs-panel ifs-inbox" style={panelStyle(2)}>
         <h2>3. Participant uploads</h2><p>Submitted names, messages and files</p>
         <div className="ifs-feed">{items.filter(i=>i.direction==='incoming').map(i=><Item key={i.id} item={i} trainer onDelete={remove}/> )}
           {!items.some(i=>i.direction==='incoming')&&<small>Waiting for participants…</small>}
         </div>
         <button className="ifs-mini" type="button" onClick={()=>load().catch(e=>setError(e.message))}>Refresh submissions</button>
         {resizeHandle(2)}
       </section>
       <QRPanel title="4. Upload QR" subtitle="Participants submit text and files here" url={link('upload',selected.upload_token)} resizeHandle={()=>resizeHandle(3)} height={layout.heights[3]+'px'}/>
     </main>
     {(error||notice)&&<div className={error?'ifs-notification ifs-error':'ifs-notification ifs-ok'} role="status">{error||notice}</div>}
   </>}
 </div>
}
function Public({mode,token}){
 const upload=mode==='upload'
 const [first,setFirst]=useState('')
 const [last,setLast]=useState('')
 const [text,setText]=useState('')
 const [files,setFiles]=useState([])
 const [items,setItems]=useState([])
 const [title,setTitle]=useState('Workshop')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [success,setSuccess]=useState('')
 const [progress,setProgress]=useState('')
 const reload=useCallback(async()=>{
   if(upload)return
   const data=await api('public_feed',{token})
   setTitle(data.title);setItems(data.items||[])
 },[upload,token])
 useEffect(()=>{reload().catch(e=>setError(e.message));if(upload)return;const id=setInterval(()=>reload().catch(console.error),6000);return ()=>clearInterval(id)},[reload,upload])
 async function submit(event){
   event.preventDefault()
   if(!first.trim()||!last.trim()){setError('First and last name are required.');return}
   if(!text.trim()&&!files.length){setError('Enter text or choose files.');return}
   setBusy(true);setError('');setSuccess('')
   try{
     const base={direction:'incoming',token,first_name:first.trim(),last_name:last.trim()}
     if(text.trim())await api('add_text',{...base,content:text.trim()})
     if(files.length)await sendFiles(files,base,setProgress)
     setText('');setFiles([]);setProgress('');setSuccess('Submitted successfully to your trainer.')
   }catch(e){setError(e.message||String(e))}finally{setBusy(false)}
 }
 return <div className="ifs-public">
   <header><strong>{TITLE}</strong><h1>{upload?'Upload to your trainer':'Downloads from your trainer'}</h1><p>{upload?'Text and multiple files can be submitted together':title}</p></header>
   <main className="ifs-public-card">
     {upload?<form onSubmit={submit}>
       <label>First name <input value={first} maxLength={50} required onChange={e=>setFirst(e.target.value)}/></label>
       <label>Last name <input value={last} maxLength={50} required onChange={e=>setLast(e.target.value)}/></label>
       <label>Text (optional) <textarea value={text} maxLength={20000} onChange={e=>setText(e.target.value)}/></label>
       <label>Attach files (up to 50 MB each) <input type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
       {files.length>0&&<p>{files.length} file(s) selected</p>}
       <button className="ifs-primary" disabled={busy}>{busy?'Sending…':'Send to trainer'}</button>
       {progress&&<p>{progress}</p>}
     </form>:<>
       <p>Everything shared during this workshop appears below and refreshes automatically.</p>
       {items.map(i=><Item key={i.id} item={i} />)}
       {!items.length&&!error&&<p>No downloads yet.</p>}
       <button className="ifs-mini" onClick={()=>reload().catch(e=>setError(e.message))}>Refresh now</button>
     </>}
     {error&&<p className="ifs-error" role="alert">{error}</p>}
     {success&&<p className="ifs-ok" role="status">{success}</p>}
   </main>
 </div>
}
export default function InstantFileSharing({mode='trainer',token=''}) {
 return mode==='trainer'?<Trainer/>:<Public mode={mode} token={token}/>
}
