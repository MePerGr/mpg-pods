import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import NewSession from './pages/NewSession.jsx'
import SessionDetail from './pages/SessionDetail.jsx'
import Clients from './pages/Clients.jsx'
import Frameworks from './pages/Frameworks.jsx'
import Settings from './pages/Settings.jsx'
import { LayoutDashboard, Plus, Users, BookOpen, Settings2, Mic } from 'lucide-react'
import './App.css'

function Sidebar() {
  const loc = useLocation()
  const nav = [
    { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/session/new', icon: Plus,          label: 'New Session' },
    { to: '/clients',   icon: Users,           label: 'Clients' },
    { to: '/frameworks',icon: BookOpen,        label: 'Frameworks' },
    { to: '/settings',  icon: Settings2,       label: 'Settings' },
  ]
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo"><Mic size={18} /></div>
        <div>
          <div className="sidebar-name">MPG Pods</div>
          <div className="sidebar-sub">Coaching Assistant</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-version">v1.0 · Phase 1</div>
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/session/new" element={<NewSession />} />
            <Route path="/session/:id" element={<SessionDetail />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/frameworks" element={<Frameworks />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
