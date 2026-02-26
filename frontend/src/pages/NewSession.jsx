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
        <p className="page-sub">Paste your Granola transcript and select the client</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'1.5rem',alignItems:'start'}}>
        <div>
          <div className="card">
            <label className="label">Session Transcript</label>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Paste your Granola transcript here..."
              style={{minHeight:380,fontSize:'0.875rem',lineHeight:1.7}}
            />
            <div style={{marginTop:'0.5rem',fontSize:'0.78rem',color:'var(--ink-mute)'}}>
              {transcript.split(/\s+/).filter(Boolean).length} words
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
                  style={{background:'none',border:'none',cursor:'pointer',color:'var(
