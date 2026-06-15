import React from 'react'
import { motion } from 'framer-motion'
import { resumeData } from '../data/resumeData'
import { Calendar, Briefcase, ChevronRight, Award } from 'lucide-react'

export const Experience: React.FC = () => {
  const { experiences } = resumeData

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 15,
        stiffness: 100,
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-10"
    >
      <section className="space-y-3">
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Work Experience
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
          시니어 프론트엔드 엔지니어로서 18년간 축적한 다양한 도메인의 대규모 서비스 설계 및 운영
          경험을 타임라인으로 확인하실 수 있습니다.
        </p>
      </section>

      {/* Timeline Layout */}
      <div
        className="timeline-container"
        style={{
          position: 'relative',
          borderLeft: '2px solid var(--line)',
          marginLeft: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '3rem',
          paddingBottom: '2rem',
        }}
      >
        {experiences.map((exp, idx) => {
          const colors = [
            'var(--accent-coral)',
            'var(--accent-gold)',
            'var(--accent-cobalt)',
            'var(--accent-mint)',
          ]
          const nodeColor = colors[idx % colors.length]

          return (
            <motion.div
              key={idx}
              variants={cardVariants}
              style={{
                position: 'relative',
                paddingLeft: '2rem',
              }}
              className="timeline-item-wrapper"
            >
              {/* Timeline Bullet Node */}
              <div
                style={{
                  backgroundColor: nodeColor,
                  position: 'absolute',
                  left: 0,
                  top: '0.5rem',
                  transform: 'translateX(-50%)',
                  width: '1rem',
                  height: '1rem',
                  borderRadius: '50%',
                  border: '4px solid var(--paper)',
                  boxShadow: 'var(--shadow-sm)',
                  zIndex: 2,
                }}
              />

              <div
                className="glass-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                {/* Header */}
                <div
                  className="timeline-card-header"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    borderBottom: '1px solid var(--line-soft)',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--ink-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Briefcase size={18} style={{ color: 'var(--accent-coral)', flexShrink: 0 }} />
                    <span>{exp.company}</span>
                  </h2>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--raise)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: '1px solid var(--surface-glass-border)',
                      width: 'fit-content',
                    }}
                  >
                    <Calendar size={12} />
                    <span>{exp.period}</span>
                  </div>
                </div>

                {/* Major Duties */}
                {exp.tasks.length > 0 && (
                  <div className="space-y-2">
                    <h3
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <ChevronRight size={14} style={{ color: 'var(--accent-gold)' }} />
                      <span>주요 업무 및 역할</span>
                    </h3>
                    <ul
                      style={{
                        listStyleType: 'disc',
                        listStylePosition: 'inside',
                        fontSize: '0.825rem',
                        color: 'var(--text-secondary)',
                      }}
                      className="space-y-2"
                    >
                      {exp.tasks.map((task, tIdx) => (
                        <li key={tIdx} style={{ lineHeight: 1.5, paddingLeft: '4px' }}>
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Achievements */}
                {exp.achievements.length > 0 && (
                  <div className="space-y-3">
                    <h3
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <Award size={14} style={{ color: 'var(--accent-mint)' }} />
                      <span>주요 실무 성과</span>
                    </h3>
                    <div
                      className="achievements-grid"
                      style={{
                        display: 'grid',
                        gap: '0.875rem',
                      }}
                    >
                      {exp.achievements.map((ach, aIdx) => (
                        <div
                          key={aIdx}
                          style={{
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--surface-glass-border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: 'var(--ink-strong)',
                            }}
                          >
                            {ach.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5,
                            }}
                          >
                            {ach.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Technical Stack used */}
                {exp.techStack && (
                  <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--line-soft)' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          marginRight: '4px',
                        }}
                      >
                        기술 스택:
                      </span>
                      {exp.techStack.split(',').map((tech, tcIdx) => (
                        <span
                          key={tcIdx}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--raise)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--surface-glass-border)',
                          }}
                        >
                          {tech.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <style>{`
        .timeline-container {
          margin-left: 0.5rem !important;
        }
        .timeline-item-wrapper {
          padding-left: 1.5rem !important;
        }
        .timeline-card-header {
          flex-direction: column !important;
          align-items: flex-start !important;
        }
        .achievements-grid {
          grid-template-columns: 1fr !important;
        }
        @media (min-width: 768px) {
          .timeline-container {
            margin-left: 1.5rem !important;
          }
          .timeline-item-wrapper {
            padding-left: 2.5rem !important;
          }
          .timeline-card-header {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          .achievements-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </motion.div>
  )
}
