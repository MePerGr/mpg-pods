import React, { useState } from 'react'
import { Check, Eye, EyeOff, ExternalLink } from 'lucide-react'

function SecretField({ label, envKey, placeholder, helpText, helpUrl }) {
  const [show, setShow] = useState(false)
  const [val, setVal] = useState('')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="field">
      <label className="label">{label}</label>
      <div style={{display:'flex',gap:'0.5rem'}}>
        <div style={{flex:1,position:'relative'}}>
          <input
            type={show ? 'text' : 'password'}
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={placeholder}
          />
          <button
            onClick={() => setShow(p => !p)}
            style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--ink-mute)'}}>
            {show ? <EyeOff size={15}/> : <Eye size={15}/>}
          </button>
        </div>
        <button className="btn btn-ghost" onClick={handleSave} style={{flexShrink:0}}>
          {saved ? <><Check size={14}/> Saved</> : 'Save'}
        </button>
      </div>
      {helpText && (
        <div style={{marginTop:'0.35rem',fontSize:'0.77rem',color:'var(--ink-mute)'}}>
          {helpText}{' '}
          {helpUrl && <a href={helpUrl} target="_blank" rel="noreferrer" style={{display:'inline-flex',alignItems:'center',gap:'0.2rem'}}>Get it here <ExternalLink size={11}/></a>}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  return (
    <div className="page fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Configure your API keys and Zapier webhooks</p>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',alignItems:'start'}}>
        <div className="card">
          <h2 className="card-title">API Keys</h2>
          <div style={{padding:'0.65rem 0.9rem',borderRadius:8,background:'rgba(184,151,58,0.1)',border:'1px solid rgba(184,151,58,0.3)',fontSize:'0.8rem',color:'var(--gold)',marginBottom:'1.25rem'}}>
            ⚠️ Keys are stored as environment variables on the server. Never share them or commit to git.
          </div>
          <SecretField label="Anthropic API Key" envKey="ANTHROPIC_API_KEY" placeholder="sk-ant-api03-…" helpText="Powers transcript analysis and theme extraction." helpUrl="https://console.anthropic.com/settings/keys" />
          <SecretField label="Listen Notes API Key" envKey="LISTEN_NOTES_API_KEY" placeholder="Your Listen Notes key" helpText="Your MPG Pods Listen Notes key." helpUrl="https://www.listennotes.com/api/dashboard/" />
        </div>

        <div className="card">
          <h2 className="card-title">Zapier Webhooks</h2>
          <div style={{padding:'0.65rem 0.9rem',borderRadius:8,background:'rgba(42,107,110,0.08)',fontSize:'0.8rem',color:'var(--teal)',marginBottom:'1.25rem'}}>
            In Zapier, create a "Catch Hook" trigger for each, then connect your preferred action (Email, WhatsApp, SMS).
          </div>
          <SecretField label="Email to Coach (you)" envKey="ZAPIER_EMAIL_COACH_URL" placeholder="https://hooks.zapier.com/hooks/catch/…" helpText="Sends session summary to your own email." />
          <SecretField label="Email to Client" envKey="ZAPIER_EMAIL_CLIENT_URL" placeholder="https://hooks.zapier.com/hooks/catch/…" helpText="Sends podcast recommendations to client's email." />
          <SecretField label="WhatsApp to Client" envKey="ZAPIER_WHATSAPP_URL" placeholder="https://hooks.zapier.com/hooks/catch/…" helpText="Sends via WhatsApp Business or Twilio." />
          <SecretField label="SMS to Client" envKey="ZAPIER_SMS_URL" placeholder="https://hooks.zapier.com/hooks/catch/…" helpText="Sends SMS. iMessage opens on your device directly." />
        </div>

        <div className="card" style={{gridColumn:'1 / -1'}}>
          <h2 className="card-title">Deployment Guide</h2>
          <div style={{fontSize:'0.875rem',color:'var(--ink-soft)',lineHeight:1.9}}>
            <p style={{marginBottom:'1rem'}}>This app is designed to run on <strong>Railway</strong>, <strong>Render</strong>, or <strong>Fly.io</strong> — all free to start. Recommended: <strong>Railway</strong>.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
              {[
                { name:'Railway', url:'https://railway.app', desc:'Simplest deployment. Free tier available. Connect GitHub repo.' },
                { name:'Render', url:'https://render.com', desc:'Great free tier. Supports Python + static sites natively.' },
                { name:'Fly.io', url:'https://fly.io', desc:'More control. Good for scaling later. Has free allowance.' },
              ].map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noreferrer"
                  style={{display:'block',padding:'1rem',borderRadius:10,border:'1px solid var(--paper-3)',textDecoration:'none',color:'var(--ink)',transition:'all 0.15s'}}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--teal)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--paper-3)'}
                >
                  <div style={{fontWeight:700,marginBottom:'0.25rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                    {p.name} <ExternalLink size={13} color="var(--ink-mute)"/>
                  </div>
                  <div style={{fontSize:'0.8rem',color:'var(--ink-mute)'}}>{p.desc}</div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{gridColumn:'1 / -1'}}>
          <h2 className="card-title">Product Roadmap</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'1rem'}}>
            {[
              { phase:'Phase 1 · Now', items:['Transcript analysis','Listen Notes search','Framework library','4-channel delivery via Zapier','Client roster'], active:true },
              { phase:'Phase 2 · Next', items:['Chrome extension for Google Meet recording','Multi-coach accounts','Session theme trends dashboard','Stripe paywall layer'], active:false },
              { phase:'Phase 3 · Future', items:['iOS / Android app (App Store)','Client-facing portal','AI-powered follow-up scheduling','Podcast transcript timestamp precision'], active:false },
            ].map(p => (
              <div key={p.phase} style={{padding:'1rem',borderRadius:10,border:`1px solid ${p.active ? 'var(--gold)' : 'var(--paper-3)'}`,background: p.active ? 'var(--gold-pale)' : 'var(--paper)'}}>
                <div style={{fontWeight:700,fontSize:'0.85rem',marginBottom:'0.6rem',color: p.active ? 'var(--gold)' : 'var(--ink-mute)'}}>
                  {p.phase}
                </div>
                {p.items.map(item => (
                  <div key={item} style={{fontSize:'0.8rem',color: p.active ? 'var(--ink-soft)' : 'var(--ink-mute)',marginBottom:'0.25rem',display:'flex',alignItems:'center',gap:'0.4rem'}}>
                    <span style={{color: p.active ? 'var(--gold)' : 'var(--paper-3)'}}>✦</span> {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
