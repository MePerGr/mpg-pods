import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, X, Loader, ChevronRight } from 'lucide-react'

export default function NewSession() {
  const [transcript, setTranscript] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClient, setNewClient] = useState({ first_name:'', last_name:'', email:'', phone:'', whatsapp:'' })
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const searchRef = useRef(null)
  const nav = useNavigate()

  useEffect(() => {
    if (clientSearch.length < 2) { setClientResults([]); return }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/clients/search?name=${encodeURIComponent(clientSearch)}`)
      const data = await r.json()
      setClientResults(data)
    }, 300)
    return () => clearTimeout(t)
  }, [clientSearch])

  async function saveNewClient() {
    if (!newClient.first_name.trim()) { setError('First name is required'); return }
    const r = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClient)
    })
    const saved = await r.json()
    setSelectedClient(saved)
    setShowNewClientForm(false)
    setClientSearch(`${saved.first_name} ${saved.last_name || ''}`.trim())
    setClientResults([])
  }

  async function handleProcess() {
    if (!transcript.trim()) { setError('Please paste a transcript'); return }
    setError('')
    setProcessing(true)
    try {
      const body = {
        transcript,
        client_name: selectedClient
          ? `${selectedClient.first_name} ${selectedClient.last_name || ''}`.trim()
          : clientSearch,
        client_id: selectedClient?.id || null
      }
      const r = await fetch('/api/sessions/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await r.json()
      if (!data.success) throw new Error(data.error || 'Processing failed')
      nav(`/sessions/${data.session_id}`)
    } catch (e) {
      setError(e.message)
      setProcessing(false)
    }
  }

  const hasContact = selectedClient && (selectedClient.email || selectedClient.phone || selectedClient.whatsapp)

  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">New Session</h1>
        <p className="page-sub">Enter or paste your session notes or transcript</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'1.5rem',alignItems:'start'}}>
        <div>
          <div className="card">
            <label className="label">Session Transcript</label>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Enter or paste your session notes or transcript here..."
              maxLength={30000} style={{minHeight:380,fontSize:'0.875rem',lineHeight:1.7}}
            />
            <div style={{marginTop:'0.5rem',fontSize:'0.78rem',color:'var(--ink-mute)'}}>
              {transcript.split(/\s+/).filter(Boolean).length} words {transcript.length > 25000 ? '— approaching limit' : ''}
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="card">
            <h3 className="card-title">Client</h3>

            {selectedClient ? (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--paper)',border:'1.5px solid var(--teal)',borderRadius:8,padding:'0.75rem 1rem'}}>
                <div>
                  <div style={{fontWeight:600}}>{selectedClient.first_name} {selectedClient.last_name}</div>
                  {selectedClient.email && <div style={{fontSize:'0.78rem',color:'var(--ink-mute)'}}>{selectedClient.email}</div>}
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch('') }}
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(--ink-mute)'}}>
                  <X size={16}/>
                </button>
              </div>
            ) : (
              <div style={{position:'relative'}}>
                <div style={{position:'relative'}}>
                  <Search size={15} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--ink-mute)'}} />
                  <input
                    ref={searchRef}
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    placeholder="Search by name..."
                    style={{paddingLeft:'2.1rem'}}
                  />
                </div>
                {clientResults.length > 0 && (
                  <div style={{position:'absolute',zIndex:10,width:'100%',background:'var(--white)',border:'1px solid var(--paper-3)',borderRadius:8,boxShadow:'var(--shadow-md)',marginTop:4,overflow:'hidden'}}>
                    {clientResults.map(c => (
                      <div key={c.id}
                        onClick={() => { setSelectedClient(c); setClientSearch(`${c.first_name} ${c.last_name||''}`.trim()); setClientResults([]) }}
                        style={{padding:'0.65rem 1rem',cursor:'pointer',fontSize:'0.875rem',borderBottom:'1px solid var(--paper-2)'}}
                        onMouseEnter={e => e.currentTarget.style.background='var(--paper)'}
                        onMouseLeave={e => e.currentTarget.style.background='var(--white)'}
                      >
                        <div style={{fontWeight:600}}>{c.first_name} {c.last_name}</div>
                        {c.email && <div style={{fontSize:'0.75rem',color:'var(--ink-mute)'}}>{c.email}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!selectedClient && clientSearch.length >= 2 && clientResults.length === 0 && (
              <div style={{marginTop:'0.75rem'}}>
                <p style={{fontSize:'0.82rem',color:'var(--ink-mute)',marginBottom:'0.5rem'}}>No client found.</p>
                <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center'}}
                  onClick={() => setShowNewClientForm(true)}>
                  <UserPlus size={15}/> Add new client
                </button>
              </div>
            )}

            {selectedClient && !hasContact && (
              <div style={{marginTop:'0.75rem',padding:'0.65rem',borderRadius:8,background:'var(--gold-pale)',fontSize:'0.8rem',color:'var(--gold)'}}>
                ⚠️ No contact info saved. Delivery options will be disabled.
                <button className="btn btn-ghost" style={{marginTop:'0.5rem',width:'100%',fontSize:'0.78rem',padding:'0.4rem',justifyContent:'center'}}
                  onClick={() => setShowNewClientForm(true)}>Add contact info</button>
              </div>
            )}
          </div>

          {showNewClientForm && (
            <div className="card fade-in">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
                <h3 className="card-title" style={{margin:0}}>New Client</h3>
                <button onClick={() => setShowNewClientForm(false)} style={{background:'none',border:'none',cursor:'pointer'}}>
                  <X size={16}/>
                </button>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">First Name *</label>
                  <input value={newClient.first_name} onChange={e => setNewClient(p => ({...p, first_name: e.target.value}))} placeholder="Jane" />
                </div>
                <div className="field">
                  <label className="label">Last Name</label>
                  <input value={newClient.last_name} onChange={e => setNewClient(p => ({...p, last_name: e.target.value}))} placeholder="Smith" />
                </div>
              </div>
              <div className="field">
                <label className="label">Email</label>
                <input type="email" value={newClient.email} onChange={e => setNewClient(p => ({...p, email: e.target.value}))} placeholder="jane@company.com" />
              </div>
              <div className="field">
                <label className="label">Phone / SMS</label>
                <input value={newClient.phone} onChange={e => setNewClient(p => ({...p, phone: e.target.value}))} placeholder="+1 555 000 0000" />
              </div>
              <div className="field">
                <label className="label">WhatsApp Number</label>
                <input value={newClient.whatsapp} onChange={e => setNewClient(p => ({...p, whatsapp: e.target.value}))} placeholder="+1 555 000 0000" />
              </div>
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={saveNewClient}>
                Save Client
              </button>
            </div>
          )}

          <button
            className="btn btn-gold"
            style={{width:'100%',justifyContent:'center',padding:'0.85rem',fontSize:'1rem'}}
            onClick={handleProcess}
            disabled={processing || !transcript.trim()}
          >
            {processing ? (
              <><div className="spinner spin" style={{width:18,height:18,borderTopColor:'var(--ink)'}}/> Processing…</>
            ) : (
              <>Analyze Session <ChevronRight size={18}/></>
            )}
          </button>

          {processing && (
            <div className="card fade-in" style={{textAlign:'center',padding:'1rem'}}>
              <div style={{fontSize:'0.82rem',color:'var(--ink-mute)',lineHeight:1.8}}>
                <div>✦ Anonymizing transcript</div>
                <div>✦ Extracting coaching themes</div>
                <div>✦ Searching Listen Notes</div>
                <div>✦ Matching frameworks</div>
                <div>✦ Drafting your message</div>
              </div>
            </div>
          )}

          {error && (
            <div style={{padding:'0.75rem 1rem',borderRadius:8,background:'rgba(192,57,43,0.08)',border:'1px solid rgba(192,57,43,0.2)',color:'var(--red)',fontSize:'0.85rem'}}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
