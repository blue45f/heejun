import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { resumeData } from '../data/resumeData'
import { Search, ExternalLink, GitBranch, Terminal, Globe, Tag } from 'lucide-react'

type ProjectType = 'all' | 'work' | 'personal'

export const Projects: React.FC = () => {
  const { mainProjects, personalProjects } = resumeData

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<ProjectType>('all')
  const [selectedTech, setSelectedTech] = useState<string | null>(null)

  // Combine projects for uniform filtering
  const allProjects = useMemo(() => {
    const workItems = mainProjects.map((p) => ({ ...p, type: 'work' as const }))
    const personalItems = personalProjects.map((p) => ({ ...p, type: 'personal' as const }))
    return [...workItems, ...personalItems]
  }, [mainProjects, personalProjects])

  // Extract all unique tech stack tags
  const allTechTags = useMemo(() => {
    const tags = new Set<string>()
    allProjects.forEach((p) => {
      if (p.techStack) {
        p.techStack.split(',').forEach((t) => {
          const trimmed = t.trim()
          if (trimmed) tags.add(trimmed)
        })
      }
    })
    return Array.from(tags).slice(0, 15)
  }, [allProjects])

  // Filtered projects selector
  const filteredProjects = useMemo(() => {
    return allProjects.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.bullets.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.techStack && p.techStack.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesType = filterType === 'all' || p.type === filterType
      const matchesTech = !selectedTech || (p.techStack && p.techStack.includes(selectedTech))

      return matchesSearch && matchesType && matchesTech
    })
  }, [allProjects, searchQuery, filterType, selectedTech])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: 'spring', stiffness: 100, damping: 15 },
    },
    exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <section className="space-y-3">
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Project Ledger
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
          주요 실무 프로젝트와 개인적으로 오픈소스로 기획·공개한 프로젝트 목록을 탐색하고 필터링해
          볼 수 있습니다.
        </p>
      </section>

      {/* Controls: Search, Tabs & Tags */}
      <div
        className="space-y-4 no-print"
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div className="search-tabs-row" style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flexGrow: 1 }}>
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
              placeholder="프로젝트명, 설명, 기술 스택 검색..."
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

          {/* Type Tabs */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--raise)',
              padding: '4px',
              borderRadius: '8px',
              border: '1px solid var(--surface-glass-border)',
              alignSelf: 'flex-start',
            }}
          >
            {(['all', 'work', 'personal'] as const).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type)
                  setSelectedTech(null)
                }}
                className={`tab-btn-custom`}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === type ? 'var(--accent-coral)' : 'transparent',
                  color: filterType === type ? 'white' : 'var(--text-secondary)',
                  boxShadow: filterType === type ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {type === 'all' ? '전체' : type === 'work' ? '실무' : '개인'}
              </button>
            ))}
          </div>
        </div>

        {/* Tech tags list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 750,
              color: 'var(--text-secondary)',
              marginRight: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Tag size={12} style={{ marginRight: '4px' }} /> 필터:
          </span>
          {allTechTags.map((tech) => (
            <button
              key={tech}
              onClick={() => setSelectedTech(selectedTech === tech ? null : tech)}
              style={{
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                border: '1px solid var(--surface-glass-border)',
                backgroundColor: selectedTech === tech ? 'rgba(217, 83, 79, 0.15)' : 'var(--raise)',
                color: selectedTech === tech ? 'var(--accent-coral)' : 'var(--text-secondary)',
                fontWeight: selectedTech === tech ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tech}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="projects-grid"
        style={{
          display: 'grid',
          gap: '1.5rem',
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, idx) => (
            <motion.div
              layout
              key={`${project.title}-${idx}`}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'between',
              }}
            >
              <div className="space-y-4">
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}
                >
                  <div className="space-y-2">
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontSize: '0.625rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        borderRadius: '4px',
                        border:
                          project.type === 'work'
                            ? '1px solid rgba(217, 83, 79, 0.2)'
                            : '1px solid rgba(92, 102, 212, 0.2)',
                        color:
                          project.type === 'work' ? 'var(--accent-coral)' : 'var(--accent-cobalt)',
                        backgroundColor:
                          project.type === 'work'
                            ? 'rgba(217, 83, 79, 0.05)'
                            : 'rgba(92, 102, 212, 0.05)',
                      }}
                    >
                      {project.type === 'work' ? 'Work Project' : 'Personal Project'}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink-strong)' }}>
                      {project.title}
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'var(--text-tertiary)',
                      backgroundColor: 'var(--raise)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--surface-glass-border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.period}
                  </span>
                </div>

                {/* Bullets List */}
                <ul
                  className="space-y-2"
                  style={{
                    listStyleType: 'none',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {project.bullets.map((b, bIdx) => (
                    <li
                      key={bIdx}
                      style={{ paddingLeft: '12px', position: 'relative', lineHeight: 1.5 }}
                    >
                      <span style={{ position: 'absolute', left: 0, color: 'var(--accent-gold)' }}>
                        •
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Specs & Footer */}
              <div
                style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--line-soft)',
                }}
                className="space-y-3"
              >
                {/* Tech stack */}
                {project.techStack && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.75rem' }}>
                    <Terminal
                      size={12}
                      style={{
                        color: 'var(--accent-gold)',
                        marginTop: '2px',
                        marginRight: '6px',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        Tech:
                      </strong>{' '}
                      {project.techStack}
                    </span>
                  </div>
                )}

                {/* Infra config */}
                {(project.infraConfig || project.publishInfo) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', fontSize: '0.75rem' }}>
                    <Globe
                      size={12}
                      style={{
                        color: 'var(--accent-mint)',
                        marginTop: '2px',
                        marginRight: '6px',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        {project.infraConfig ? 'Infra:' : 'Publish:'}
                      </strong>{' '}
                      {project.infraConfig || project.publishInfo}
                    </span>
                  </div>
                )}

                {/* Links */}
                {project.links && project.links.length > 0 && (
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '6px' }}
                    className="no-print"
                  >
                    {project.links.map((link, lIdx) => (
                      <a
                        key={lIdx}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          backgroundColor: 'var(--raise)',
                          border: '1px solid var(--surface-glass-border)',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--line)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--raise)'
                          e.currentTarget.style.borderColor = 'var(--surface-glass-border)'
                        }}
                      >
                        <GitBranch size={10} style={{ color: 'var(--accent-cobalt)' }} />
                        <span>{link.text}</span>
                        <ExternalLink size={8} style={{ color: 'var(--text-tertiary)' }} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-tertiary)' }}>
          <p style={{ fontSize: '0.875rem' }}>검색 결과에 맞는 프로젝트가 없습니다.</p>
        </div>
      )}

      <style>{`
        .search-tabs-row {
          flex-direction: column !important;
        }
        .projects-grid {
          grid-template-columns: 1fr !important;
        }
        @media (min-width: 640px) {
          .search-tabs-row {
            flex-direction: row !important;
            align-items: center !important;
          }
        }
        @media (min-width: 768px) {
          .projects-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </motion.div>
  )
}
