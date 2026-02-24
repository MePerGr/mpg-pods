import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Users, BookOpen, Clock, ChevronRight, Mic } from 'lucide-react'

export default function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [clients, setClients] = useState([])
  const [frameworks, setFrameworks] = useState([])
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([
      fetch('/api/sessions').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/frameworks').then(r => r.json()),
    ]).then(([s, c, f]) => {
      setSessions(s)
      setClients(c)
      setFrameworks(f)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div className="spinner spin" />
    </div>
  )

  return (
    <div className="page fade-in">
      <div className="page-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Good morning</h1>
          <p className="page-sub">Your executive coaching dashboard</p>
        </div>
        <button className="btn btn-gold" onClick={() => nav('/session/new')}>
          <Plus size={16} /> New Session
        </button>
      </div>

      <div className="grid-3" style={{marginBottom:'2rem'}}>
        <StatCard icon={<Mic size={20}/>} label="Sessions" value={sessions.length} sub="total processed" />
        <StatCard icon={<Users size={20}/>} label="Clients" value={clients.length} sub="in your roster" />
        <StatCard icon={<BookOpen size={20}/>} label="Frameworks" value={frameworks.length} sub="in the library" />
      </div>

      <div className="card" style={{marginBottom:'1.5rem'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
          <h2 className="card-title" style={{margin:0}}>Recent Sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎙️</div>
            <div className="empty-title">No sessions yet</div>
            <div className="empty-sub">Start by processing your first coaching transcript</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
            {sessions.slice(0,8).map(s => (
              <SessionRow key={s.id} session={s} onClick={() => nav(`/session/${s.id}`)} />
            ))}
          </div>
        )}
      </div>

      {frameworks.length > 0 && (
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
            <h2 className="card-title" style={{margin:0}}>Framework Library</h2>
            <button className="btn btn-ghost" style={{padding:'0.4rem 0.75rem',fontSize:'0.8rem'}} onClick={() => nav('/frameworks')}>
              View all <ChevronRight size={14}/>
            </button>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'0.5rem'}}>
            {frameworks.slice(0,6).map(f => (
              <span key={f.id} className="badge badge-teal" style={{fontSize:'0.8rem',padding:'0.3rem 0.8rem'}}>
                {f.name}
              </span>
            ))}
            {frameworks.length > 6 && (
              <span className="badge badge-ink">+{frameworks.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card" style={{display:'flex',alignItems:'center',gap:'1rem'}}>
      <div style={{
        width:44,height:44,borderRadius:10,
        background:'var(--gold-pale)',color:'var(--gold)',
        display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
      }}>{icon}</div>
      <div>
        <div style={{fontSize:'1.6rem',fontWeight:700,fontFamily:'var(--font-display)',lineHeight:1}}>{value}</div>
        <div style={{fontSize:'0.8rem',color:'var(--ink-mute)',marginTop:'0.2rem'}}>{sub}</div>
      </div>
    </div>
  )
}

function SessionRow({ session, onClick }) {
  const date = new Date(session.session_date).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
  const clientName = session.first_name
    ? `${session.first_name} ${session.last_name || ''}`.trim()
    : session.client_name_raw || 'Unknown client'

  return (
    <div onClick={onClick} style={{
      display:'flex',alignItems:'center',justifyContent:'space-between',
      padding:'0.75rem 1rem',borderRadius:8,cursor:'pointer',
      background:'var(--paper)',border:'1px solid var(--paper-3)',
      transition:'all 0.15s'
    }}
    onMouseEnter={e => e.currentTarget.style.background='var(--paper-2)'}
    onMouseLeave={e => e.currentTarget.style.background='var(--paper)'}
    >
      <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
        <div style={{
          width:34,height:34,borderRadius:'50%',
          background:'var(--ink)',color:'var(--gold)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:'0.8rem',fontWeight:700,flexShrink:0
        }}>
          {clientName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{fontWeight:600,fontSize:'0.9rem'}}>{clientName}</div>
          <div style={{fontSize:'0.78rem',color:'var(--ink-mute)',display:'flex',alignItems:'center',gap:'0.4rem'}}>
            <Clock size={11}/> {date}
          </div>
        </div>
      </div>
      <ChevronRight size={16} color="var(--ink-mute)" />
    </div>
  )
}
