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
            <h2 className="card-title">Session Themes</h2>
            <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
              {(session.themes || []).map((t, i) => (
                <div key={i} style={{borderLeft:'3px solid var(--gold)',paddingLeft:'1rem',paddingTop:'0.1rem',paddingBottom:'0.1rem'}}>
                  <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:'0.2rem'}}>{t.name}</div>
                  <div style={{fontSize:'0.85rem',color:'var(--ink-soft)',marginBottom:'0.2rem'}}>{t.description}</div>
                  {t.coaching_need && (
                    <div style={{fontSize:'0.78rem',color:'var(--ink-mute)',fontStyle:'italic'}}>
                      💡 {t.coaching_need}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="card-title" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
              <Headphones size={18} color="var(--teal)"/> Podcast Recommendations
            </h2>
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              {(session.podcasts || []).map((ep, i) => (
                <EpisodeCard key={i} ep={ep} num={i+1} />
              ))}
              {(!session.podcasts || session.podcasts.length === 0) && (
                <p style={{color:'var(--ink-mute)',fontSize:'0.875rem'}}>No episodes found for this session.</p>
              )}
            </div>
          </div>

          {session.frameworks?.length > 0 && (
            <div className="card">
              <h2 className="card-title" style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <BookOpen size={18} color="var(--teal)"/> Recommended Frameworks
              </h2>
              <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                {session.frameworks.map((fw, i) => (
                  <FrameworkCard key={i} fw={fw} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div className="card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.75rem'}}>
              <h3 className="card-title" style={{margin:0,display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <MessageSquare size={16} color="var(--teal)"/> Draft Message
              </h3>
              <button className="btn btn-ghost" style={{padding:'0.3rem 0.6rem',fontSize:'0.78rem'}} onClick={copyMessage}>
                {copied ? <><Check size={13}/> Copied</> : <><Copy size={13}/> Copy</>}
              </button>
            </div>
            <div style={{fontSize:'0.875rem',lineHeight:1.75,color:'var(--ink-soft)',background:'var(--paper)',borderRadius:8,padding:'1rem',whiteSpace:'pre-wrap'}}>
              {session.drafted_message}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Send to Client</h3>
            {!hasContact && (
              <div style={{fontSize:'0.8rem',color:'var(--ink-mute)',background:'var(--paper-2)',borderRadius:8,padding:'0.65rem',marginBottom:'0.75rem'}}>
                No contact info saved for this client. Update their profile to enable delivery.
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
              <DeliveryBtn label="Email to Me" icon={<Mail size={15}/>} method="email_coach" delivering={delivering} status={deliveryStatus.email_coach} onDeliver={deliver} enabled={true} />
              <DeliveryBtn label="Email to Client" icon={<Mail size={15}/>} method="email_client" delivering={delivering} status={deliveryStatus.email_client} onDeliver={deliver} enabled={!!client?.email} />
              <DeliveryBtn label="WhatsApp to Client" icon={<Send size={15}/>} method="whatsapp" delivering={delivering} status={deliveryStatus.whatsapp} onDeliver={deliver} enabled={!!client?.whatsapp} />
              <button className="btn btn-ghost" style={{justifyContent:'flex-start',opacity: client?.phone ? 1 : 0.35}} disabled={!client?.phone} onClick={openImessage}>
                <Phone size={15}/> Open in iMessage
                <span style={{marginLeft:'auto',fontSize:'0.72rem',color:'var(--ink-mute)'}}>Opens app</span>
              </button>
            </div>
          </div>

          <div style={{fontSize:'0.75rem',color:'var(--ink-mute)',padding:'0.65rem 0.75rem',background:'var(--paper-2)',borderRadius:8}}>
            🔒 Transcript anonymized before processing. No client names were sent to any AI model.
          </div>
        </div>
      </div>
    </div>
  )
}

function EpisodeCard({ ep, num }) {
  return (
    <div style={{border:'1px solid var(--paper-3)',borderRadius:10,padding:'1rem',background:'var(--paper)'}}>
      <div style={{display:'flex',gap:'0.75rem',alignItems:'flex-start'}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'var(--teal)',color:'var(--white)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,flexShrink:0}}>{num}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:'0.875rem',lineHeight:1.3,marginBottom:'0.2rem'}}>{ep.episode_title}</div>
          <div style={{fontSize:'0.78rem',color:'var(--ink-mute)',marginBottom:'0.5rem'}}>{ep.podcast_name}</div>
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap'}}>
            <span style={{display:'inline-flex',alignItems:'center',gap:'0.3rem',background:'var(--gold-pale)',color:'var(--gold)',padding:'0.2rem 0.6rem',borderRadius:99,fontSize:'0.75rem',fontWeight:600}}>
              <Clock size={11}/> {ep.golden_nugget_timestamp}
            </span>
            {ep.listen_notes_url && (
              <a href={ep.listen_notes_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'0.3rem',fontSize:'0.78rem',color:'var(--teal)'}}>
                Listen <ExternalLink size={11}/>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FrameworkCard({ fw }) {
  return (
    <div style={{border:'1px solid var(--paper-3)',borderRadius:10,padding:'1rem',background:'var(--paper)'}}>
      <div style={{fontWeight:700,fontSize:'0.875rem',marginBottom:'0.25rem'}}>{fw.name}</div>
      <div style={{fontSize:'0.825rem',color:'var(--ink-soft)',marginBottom:'0.4rem'}}>{fw.short_description}</div>
      {fw.relevance_reason && (
        <div style={{fontSize:'0.78rem',color:'var(--ink-mute)',fontStyle:'italic',marginBottom:'0.5rem'}}>
          Why now: {fw.relevance_reason}
        </div>
      )}
      {fw.implementation_url && (
        <a href={fw.implementation_url} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'0.3rem',fontSize:'0.78rem',color:'var(--teal)'}}>
          Implementation guide <ExternalLink size={11}/>
        </a>
      )}
    </div>
  )
}

function DeliveryBtn({ label, icon, method, delivering, status, onDeliver, enabled }) {
  const sent = status === 'sent'
  const err  = status === 'error'
  const busy = delivering === method
  return (
    <button
      className={`btn ${sent ? 'btn-teal' : 'btn-ghost'}`}
      style={{justifyContent:'flex-start',opacity: enabled ? 1 : 0.35,background: sent ? 'rgba(42,107,110,0.08)' : undefined,borderColor: sent ? 'var(--teal)' : err ? 'var(--red)' : undefined,color: sent ? 'var(--teal)' : err ? 'var(--red)' : undefined}}
      disabled={!enabled || !!delivering}
      onClick={() => onDeliver(method)}
    >
      {busy ? <div className="spinner spin" style={{width:15,height:15}}/> : icon}
      {label}
      {sent && <Check size={13} style={{marginLeft:'auto'}}/>}
      {err  && <span style={{marginLeft:'auto',fontSize:'0.72rem'}}>Failed</span>}
    </button>
  )
}
