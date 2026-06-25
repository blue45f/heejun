import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resumeData } from '../data/resumeData'
import { BookOpen, Search, X, Maximize2, FileText, ExternalLink } from 'lucide-react'

export const Guides: React.FC = () => {
  const { guides } = resumeData
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGuidePath, setSelectedGuidePath] = useState<string | null>(null)
  const [selectedGuideName, setSelectedGuideName] = useState<string | null>(null)

  // Filter guides based on search query
  const filteredGuides = guides.filter(
    (guide) =>
      guide.id.includes(searchQuery) ||
      guide.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <section className="space-y-3">
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Developer Guides
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
          개발 표준, 아키텍처 가이드라인, 인프라 운영체계 등 18년 실무 경험을 바탕으로 개인적으로
          정리하고 축적한 31종의 기술 가이드입니다.
        </p>
      </section>

      {/* Search Bar */}
      <div className="no-print" style={{ position: 'relative', maxWidth: '400px' }}>
        <Search
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)',
          }}
          size={18}
        />
        <input
          type="text"
          placeholder="가이드 번호 또는 제목 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px 10px 2.5rem',
            borderRadius: '8px',
            backgroundColor: 'var(--surface-glass)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--surface-glass-border)',
            fontSize: '0.875rem',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
      </div>

      {/* Guide Cards Grid */}
      <div
        className="guides-grid"
        style={{
          display: 'grid',
          gap: '1rem',
        }}
      >
        {filteredGuides.map((guide, idx) => (
          <motion.div
            key={guide.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            whileHover={{ y: -2 }}
            onClick={() => {
              setSelectedGuidePath(guide.path)
              setSelectedGuideName(`${guide.id} ${guide.name}`)
            }}
            className="glass-card"
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div
              className="flex items-center"
              style={{ gap: '0.75rem', minWidth: 0, overflow: 'hidden' }}
            >
              <div
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--raise)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BookOpen size={16} style={{ color: 'var(--accent-coral)' }} />
              </div>
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: 'var(--accent-gold)',
                    textTransform: 'uppercase',
                    display: 'block',
                    letterSpacing: '0.02em',
                  }}
                >
                  Guide #{guide.id}
                </span>
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'block',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {guide.name}
                </span>
              </div>
            </div>
            <Maximize2 size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          </motion.div>
        ))}
      </div>

      {/* Interactive Guide Reader Overlay */}
      <AnimatePresence>
        {selectedGuidePath && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            className="no-print"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--surface-glass-border)',
                width: '100%',
                maxWidth: '960px',
                height: '80vh',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Reader Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid var(--line-soft)',
                  backgroundColor: 'var(--raise)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <FileText size={18} style={{ color: 'var(--accent-coral)', flexShrink: 0 }} />
                  <h3
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {selectedGuideName}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    href={selectedGuidePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px',
                      borderRadius: '50%',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="새 창에서 열기"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => {
                      setSelectedGuidePath(null)
                      setSelectedGuideName(null)
                    }}
                    style={{
                      padding: '6px',
                      borderRadius: '50%',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Document Frame */}
              <div style={{ flexGrow: 1, backgroundColor: 'white' }}>
                <iframe
                  src={selectedGuidePath}
                  title={selectedGuideName || 'Developer Guide'}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .guides-grid {
          grid-template-columns: 1fr !important;
        }
        @media (min-width: 480px) {
          .guides-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (min-width: 768px) {
          .guides-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </motion.div>
  )
}
