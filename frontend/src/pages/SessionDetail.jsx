import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Headphones, BookOpen, MessageSquare, Mail, Phone,
  Send, ExternalLink, Clock, Copy, Check, ChevronLeft, Loader
} from 'lucide-react'

export default function SessionDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [client, setClient] = useState(null)
  const [copied, setCopied] = useState(false)
  const [delivering, setDelivering] = useState(null)
  const [deliveryStatus, setDeliveryStatus] = useState({})

  useEffect(() => {
    fetch(`/api/session/${id}`)
      .then(r => r.json())
      .then(data => {
        setSession(data)
        if (data.client_id) {
          fetch(`/api/clients`).then(r => r.json()).then(clients => {
            setClient(clients.find(c => c.id === data.client_id) || null)
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function deliver(method) {
    if (!session) return
    setDelivering(method)
    const payload = {
      client_name: client ? `${client.first_name} ${client.last_name || ''}`.trim() : session.client_name_raw,
      message: session.drafted_message,
      email: client?.email || '',
      phone: client?.phone || '',
      whatsapp: client?.whatsapp || '',
      episodes: session.podcasts?.map(p => ({
        title: p.episode_title,
        podcast: p.podcast_name,
        url: p.listen_notes_url,
        timestamp: p.golden_nugget_timestamp
      })) || []
    }
    try {
      const r = await fetch('/api/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, payload })
      })
      const data = await r.json()
      setDeliveryStatus(prev => ({ ...prev, [method]: data.success ? 'sent' : 'error' }))
    } catch {
      setDeliveryStatus(prev => ({ ...prev, [method]: 'error' }))
    } finally {
      setDelivering(null)
    }
  }

  function copyMessage() {
    navigator.clipboard.writeText(session.drafted_message || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openImessage() {
    const msg = encodeURIComponent(session.drafted_message || '')
    const phone = client?.phone ? encodeURIComponent(client.phone) : ''
    window.open(`sms:${phone}&body=${msg}`, '_blank')
  }

  const hasContact = client && (client.email || client.phone || client.whatsapp)

  if (loading) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div className="spinner spin" />
    </div>
  )

  if (!session) return (
    <div className="page"><p>Session not found.</p></div>
  )

  const clientName = client
    ? `${client.first_name} ${client.last_name || ''}`.trim()
    : session.client_name_raw || 'Unknown'

  const date = new Date(session.session_date).toLocaleDateString('en-US',{
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  return (
    <div className="page fade-in">
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem',marginBottom:'2rem'}}>
        <button className="btn btn-ghost" style={{padding:'0.4rem 0.75rem'}} onClick={() => nav(-1)}>
          <ChevronLeft size={16}/>
        </button>
        <div>
          <h1 className="page-title" style={{fontSize:'1.4rem'}}>{clientName}</h1>
          <p className="page-sub">{date}</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'1.5rem',alignItems:'start'}}>
        <div style={{display:'flex',flexDirection:'column',gap:'1.25rem'}}>
          <div className="card">
            <h2 className="card-title">Session Theme
