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
            <Search size={14} style={{position:'absolute',left:9,top:'50%',tr
