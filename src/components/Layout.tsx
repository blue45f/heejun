import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Sun, Moon, Download, Menu, X, FileText, Briefcase, Grid, BookOpen } from 'lucide-react'
import { exportToPdf } from '../utils/exportPdf'
import { resumeData } from '../data/resumeData'
import { FullResumePdfTemplate } from './FullResumePdfTemplate'

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const [isExporting, setIsExporting] = useState(false)

  // Initialize theme from storage
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme =
      saved === 'dark' || (saved !== 'light' && systemPrefersDark) ? 'dark' : 'light'

    setTheme(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
  }

  const handlePdfDownload = async () => {
    setIsExporting(true)
    await exportToPdf('full-resume-pdf-template', '김희준_이력서_통합본.pdf')
    setIsExporting(false)
  }

  const navItems = [
    { path: '/', label: '소개', icon: FileText },
    { path: '/experience', label: '경력', icon: Briefcase },
    { path: '/projects', label: '프로젝트', icon: Grid },
    { path: '/guides', label: '가이드', icon: BookOpen },
  ]

  return (
    <div className="flex flex-col">
      {/* Top Navbar */}
      <nav
        className="navbar glass-panel no-print"
        style={{ borderBottom: '1px solid var(--surface-glass-border)' }}
      >
        <div
          className="max-width-container flex items-center justify-between"
          style={{ height: '100%' }}
        >
          <Link
            to="/"
            className="flex items-center space-x-2"
            style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '-0.02em' }}
          >
            <span style={{ color: 'var(--accent-coral)', fontWeight: 800 }}>&lt;</span>
            <span style={{ color: 'var(--text-primary)' }}>{resumeData.personalInfo.name}</span>
            <span
              style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 'normal' }}
            >
              포트폴리오
            </span>
            <span style={{ color: 'var(--accent-cobalt)', fontWeight: 800 }}>/&gt;</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="md-flex items-center space-x-6" style={{ display: 'none' }}>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={14} style={{ marginRight: '4px' }} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Action buttons (Right) */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="테마 전환"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            <button
              onClick={handlePdfDownload}
              disabled={isExporting}
              className="btn-primary"
              style={{ display: 'none' }} // Media query overrides this visually via inline styling helper or CSS
            >
              <Download size={14} />
              <span>{isExporting ? 'PDF 생성 중...' : 'PDF 저장'}</span>
            </button>

            {/* Mobile Hamburger menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px',
                borderRadius: '50%',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="mobile-hamburger-btn"
              aria-label="메뉴 토글"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div
            className="no-print"
            style={{
              position: 'absolute',
              top: '4rem',
              left: 0,
              right: 0,
              backgroundColor: 'var(--surface)',
              borderBottom: '1px solid var(--line)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.9rem',
                    color: isActive ? 'var(--accent-coral)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
            <button
              onClick={() => {
                setMenuOpen(false)
                handlePdfDownload()
              }}
              disabled={isExporting}
              className="btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '10px',
                marginTop: '6px',
              }}
            >
              <Download size={16} />
              <span>{isExporting ? 'PDF 생성 중...' : 'PDF 저장'}</span>
            </button>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main
        id="resume-content"
        className="flex-grow max-width-container"
        style={{ paddingTop: '6rem', paddingBottom: '4rem' }}
      >
        {children}
      </main>

      {/* Footer */}
      <footer
        className="no-print"
        style={{
          padding: '1.5rem 0',
          borderTop: '1px solid var(--line-soft)',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-tertiary)',
        }}
      >
        <div className="max-width-container">
          <p>
            © {new Date().getFullYear()} {resumeData.personalInfo.name}. All rights reserved.
          </p>
          <p style={{ marginTop: '4px' }}>
            Vite + React + TypeScript + Framer Motion 기반의 프리미엄 이력서 웹사이트
          </p>
        </div>
      </footer>

      {/* Media query styling inline hacks or custom CSS blocks */}
      {/* PDF 전용 통합 이력서 템플릿 */}
      <div id="full-resume-pdf-template" className="pdf-only-content">
        <FullResumePdfTemplate />
      </div>

      <style>{`
        @media (min-width: 768px) {
          .md-flex { display: flex !important; }
          .btn-primary { display: flex !important; }
          .mobile-hamburger-btn { display: none !important; }
        }
        @media (min-width: 640px) {
          .btn-primary { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
