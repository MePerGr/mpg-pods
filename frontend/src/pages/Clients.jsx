import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, X, Check, ChevronRight, Search, Edit2 } from 'lucide-react'

const EMPTY = { first_name:'', last_name:'', email:'', phone:'', whatsapp:'', notes:'' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sessions, setSessions] = useState([])
  const nav = useNavigate()

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(setClients)
    fetch('/api/sessions').then(r => r.json()).then(setSessions)
  }, [])

  function sessionCount(clientId) {
    return sessions.filter(s => s.client_id === clientId).length
  }

  async function save() {
    setSaving(true)
    const method = isNew ? 'POST' : 'PUT'
    const url = isNew ? '/api/clients' : `/api/clients/${selected.id}`
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const saved = await r.json()
    if (isNew) {
      setClients(prev => [...prev, saved])
    } else {
      setClients(prev => prev.map(c => c.id === saved.id ? saved : c))
    }
    setSelected(saved)
    setIsNew(false)
    setSaving(false)
  }

  function startNew() {
    setForm(EMPTY)
    setSelected(null)
    setIsNew(true)
  }

  function selectClient(c) {
    setSelected(c)
    setForm(c)
    setIsNew(false)
  }

  const filtered = clients.filter(c =>
    `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page fade-in">
      <div className="page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-sub">{clients.length} client{clients.length !== 1 ? 's' : ''} in your roster</p>
        </div>
        <button className="btn btn-gold" onClick={startNew}><UserPlus size={15}/> Add Client</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'1.5rem',alignItems:'start'}}>
        <div className="card" style={{padding:'1rem'}}>
          <div style={{position:'relative',marginBottom:'0.75rem'}}>
            <Search size={14} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--ink-mute)'}}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{paddingLeft:'2rem',fontSize:'0.85rem'}}/>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
            {filtered.map(c => {
              const sc = sessionCount(c.id)
              const active = selected?.id === c.id && !isNew
              return (
                <div key={c.id} onClick={() => selectClient(c)}
                  style={{padding:'0.65rem 0.75rem',borderRadius:8,cursor:'pointer',background: active ? 'var(--ink)' : 'transparent',color: active ? 'var(--white)' : 'var(--ink)',transition:'all 0.15s'}}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--paper-2)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{fontWeight:600,fontSize:'0.875rem'}}>{c.first_name} {c.last_name}</div>
                  <div style={{fontSize:'0.75rem',opacity: active ? 0.65 : undefined, color: active ? undefined : 'var(--ink-mute)'}}>
                    {sc} session{sc !== 1 ? 's' : ''}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{textAlign:'center',padding:'1.5rem',color:'var(--ink-mute)',fontSize:'0.85rem'}}>No clients found</div>
            )}
          </div>
        </div>

        {(selected || isNew) ? (
          <div className="card fade-in">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.5rem'}}>
              <h2 className="card-title" style={{margin:0}}>
                {isNew ? 'New Client' : `${selected.first_name} ${selected.last_name || ''}`}
              </h2>
              {!isNew && (
                <button className="btn btn-ghost" style={{padding:'0.4rem 0.75rem',fontSize:'0.8rem'}}
                  onClick={() => nav(`/sessions?client_id=${selected.id}`)}>
                  View Sessions <ChevronRight size={14}/>
                </button>
              )}
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label">First Name *</label>
                <input value={form.first_name} onChange={e => setForm(p => ({...p, first_name: e.target.value}))} placeholder="Jane"/>
              </div>
              <div className="field">
                <label className="label">Last Name</label>
                <input value={form.last_name} onChange={e => setForm(p => ({...p, last_name: e.target.value}))} placeholder="Smith"/>
              </div>
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="jane@company.com"/>
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="label">Phone / iMessage</label>
                <input value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="+1 555 000 0000"/>
              </div>
              <div className="field">
                <label className="label">WhatsApp</label>
                <input value={form.whatsapp} onChange={e => setForm(p => ({...p, whatsapp: e.target.value}))} placeholder="+1 555 000 0000"/>
              </div>
            </div>
            <div className="field">
              <label className="label">Notes (private)</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} placeholder="Internal notes about this client…" style={{minHeight:80}}/>
            </div>
            <div style={{display:'flex',gap:'0.75rem'}}>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <div className="spinner spin" style={{width:16,height:16}}/> : <Check size={16}/>}
                {isNew ? 'Create Client' : 'Save Changes'}
              </button>
              {isNew && (
                <button className="btn btn-ghost" onClick={() => { setIsNew(false); setSelected(null) }}>
                  <X size={15}/> Cancel
                </button>
              )}
            </div>

            {!isNew && (
              <div style={{marginTop:'1.5rem',paddingTop:'1.5rem',borderTop:'1px solid var(--paper-3)'}}>
                <div style={{fontSize:'0.78rem',fontWeight:600,color:'var(--ink-mute)',marginBottom:'0.5rem',textTransform:'uppercase',letterSpacing:'0.04em'}}>Contact Summary</div>
                <div style={{display:'flex',gap:'0.5rem',flexWrap:'wrap'}}>
                  {selected.email ? <span className="badge badge-teal">✉ {selected.email}</span> : <span className="badge badge-ink">No email</span>}
                  {selected.phone ? <span className="badge badge-teal">📱 {selected.phone}</span> : <span className="badge badge-ink">No phone</span>}
                  {selected.whatsapp ? <span className="badge badge-teal">💬 {selected.whatsapp}</span> : <span className="badge badge-ink">No WhatsApp</span>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="empty">
              <div className="empty-icon">👥</div>
              <div className="empty-title">Select a client</div>
              <div className="empty-sub">Choose from the list or add a new one</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
