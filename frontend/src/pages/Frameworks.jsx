import React, { useState, useEffect } from 'react'
import { BookOpen, ExternalLink, Search } from 'lucide-react'

export default function Frameworks() {
  const [frameworks, setFrameworks] = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/frameworks').then(r => r.json()).then(setFrameworks)
  }, [])

  const filtered = frameworks.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.short_description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page fade-in">
      <div className="page-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <h1 className="page-title">Framework Library</h1>
          <p className="page-sub">{frameworks.length} frameworks accumulated across all sessions</p>
        </div>
      </div>

      <div style={{maxWidth:520,marginBottom:'1.5rem',position:'relative'}}>
        <Search size={15} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--ink-mute)'}}/>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search frameworks…" style={{paddingLeft:'2.2rem'}}/>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon">📚</div>
            <div className="empty-title">{frameworks.length === 0 ? 'No frameworks yet' : 'No results'}</div>
            <div className="empty-sub">
              {frameworks.length === 0
                ? 'Frameworks are automatically added as you process sessions'
                : 'Try a different search term'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:'1rem'}}>
          {filtered.map(fw => (
            <div key={fw.id} className="card" style={{padding:'1.25rem'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:'0.75rem',marginBottom:'0.75rem'}}>
                <div style={{width:36,height:36,borderRadius:8,background:'var(--gold-pale)',color:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <BookOpen size={16}/>
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:'0.9rem',lineHeight:1.3}}>{fw.name}</div>
                  {fw.category && (
                    <span className="badge badge-ink" style={{marginTop:'0.25rem',display:'inline-block'}}>{fw.category}</span>
                  )}
                </div>
              </div>
              <p style={{fontSize:'0.85rem',color:'var(--ink-soft)',lineHeight:1.6,marginBottom:'0.75rem'}}>
                {fw.short_description}
              </p>
              {fw.implementation_url && (
                <a href={fw.implementation_url} target="_blank" rel="noreferrer"
                  style={{display:'inline-flex',alignItems:'center',gap:'0.35rem',fontSize:'0.8rem',color:'var(--teal)',fontWeight:500}}>
                  Implementation guide <ExternalLink size={12}/>
                </a>
              )}
              <div style={{marginTop:'0.75rem',paddingTop:'0.75rem',borderTop:'1px solid var(--paper-3)',fontSize:'0.72rem',color:'var(--ink-mute)'}}>
                Added {new Date(fw.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
