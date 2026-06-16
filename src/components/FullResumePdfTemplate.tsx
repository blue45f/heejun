import React from 'react'
import { resumeData } from '../data/resumeData'
import {
  Mail,
  Phone,
  Github,
  MapPin,
  Award,
  CheckCircle,
  Briefcase,
  ChevronRight,
} from 'lucide-react'

export const FullResumePdfTemplate: React.FC = () => {
  const {
    personalInfo,
    competencies,
    selfIntroduction,
    experiences,
    mainProjects,
    personalProjects,
  } = resumeData

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail size={12} style={{ color: '#ef4444' }} />
      case 'phone':
        return <Phone size={12} style={{ color: '#fbbf24' }} />
      case 'github':
        return <Github size={12} style={{ color: '#3b82f6' }} />
      case 'location':
        return <MapPin size={12} style={{ color: '#10b981' }} />
      default:
        return <Award size={12} style={{ color: '#64748b' }} />
    }
  }

  return (
    <div
      style={{
        padding: '20mm 15mm',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontFamily: 'var(--sans)',
      }}
    >
      {/* 1. Header (개인 정보) */}
      <header
        style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#ef4444',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              {personalInfo.jobTitle}
            </div>
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                color: '#0f172a',
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              {personalInfo.name}
            </h1>
            <p
              style={{
                fontSize: '1.1rem',
                fontWeight: 500,
                color: '#475569',
                marginTop: '6px',
                lineHeight: 1.4,
              }}
            >
              {personalInfo.title}
            </p>
          </div>
          <div
            style={{
              width: '4.5rem',
              height: '4.5rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #fbbf24, #3b82f6)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {personalInfo.experienceYears}
              </span>
              <span
                style={{ fontSize: '0.45rem', fontWeight: 600, color: '#64748b', marginTop: '2px' }}
              >
                YEARS EXP
              </span>
            </div>
          </div>
        </div>

        {/* 연락처 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: '#475569',
          }}
        >
          {personalInfo.contact.map((c, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getContactIcon(c.type)}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* 2. 핵심 역량 */}
      <section style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '1.25rem',
              backgroundColor: '#ef4444',
              borderRadius: '2px',
            }}
          />
          핵심 역량
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {competencies.map((comp, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.8rem',
                backgroundColor: '#f8fafc',
              }}
            >
              <h3
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                {comp.category}
              </h3>
              <ul
                style={{
                  paddingLeft: '1rem',
                  margin: 0,
                  fontSize: '0.75rem',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                {comp.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} style={{ marginBottom: '4px' }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 자기소개 */}
      <section style={{ marginBottom: '2rem', pageBreakAfter: 'always' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '0.5rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '1.25rem',
              backgroundColor: '#3b82f6',
              borderRadius: '2px',
            }}
          />
          자기소개
        </h2>
        <p
          style={{
            fontSize: '0.8rem',
            color: '#475569',
            lineHeight: 1.6,
            whiteSpace: 'pre-line',
            margin: 0,
          }}
        >
          {selfIntroduction}
        </p>
      </section>

      {/* 4. 경력 사항 */}
      <section style={{ marginBottom: '2rem' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '0.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '1.25rem',
              backgroundColor: '#10b981',
              borderRadius: '2px',
            }}
          />
          Work Experience
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {experiences.map((exp, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                borderBottom: idx < experiences.length - 1 ? '1px dashed #e2e8f0' : 'none',
                paddingBottom: idx < experiences.length - 1 ? '1.5rem' : 0,
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Briefcase size={16} style={{ color: '#ef4444' }} />
                  {exp.company}
                </h3>
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                  }}
                >
                  {exp.period}
                </div>
              </div>

              {exp.tasks.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  <h4
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      margin: '0 0 4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ChevronRight size={12} style={{ color: '#fbbf24' }} /> 주요 업무 및 역할
                  </h4>
                  <ul
                    style={{
                      listStyleType: 'disc',
                      listStylePosition: 'inside',
                      paddingLeft: '4px',
                      margin: 0,
                      fontSize: '0.75rem',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    {exp.tasks.map((task, tIdx) => (
                      <li key={tIdx} style={{ marginBottom: '2px' }}>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {exp.achievements.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <h4
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      margin: '0 0 6px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Award size={12} style={{ color: '#10b981' }} /> 주요 실무 성과
                  </h4>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '0.5rem',
                    }}
                  >
                    {exp.achievements.map((ach, aIdx) => (
                      <div
                        key={aIdx}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>
                          {ach.title}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: '#64748b',
                            marginTop: '2px',
                            lineHeight: 1.4,
                          }}
                        >
                          {ach.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {exp.techStack && (
                <div style={{ marginTop: '6px', fontSize: '0.7rem', color: '#475569' }}>
                  <strong>기술 스택:</strong>{' '}
                  {exp.techStack.split(',').map((tech, tcIdx) => (
                    <span
                      key={tcIdx}
                      style={{
                        padding: '1px 6px',
                        margin: '0 2px',
                        borderRadius: '3px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                      }}
                    >
                      {tech.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 5. 프로젝트 목록 */}
      <section style={{ marginTop: '2rem', pageBreakBefore: 'always' }}>
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            borderBottom: '1px solid #cbd5e1',
            paddingBottom: '0.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '1.25rem',
              backgroundColor: '#fbbf24',
              borderRadius: '2px',
            }}
          />
          Project Ledger
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          {[...mainProjects, ...personalProjects].map((proj, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
                pageBreakInside: 'avoid',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      backgroundColor: mainProjects.includes(proj) ? '#fef2f2' : '#eff6ff',
                      color: mainProjects.includes(proj) ? '#ef4444' : '#3b82f6',
                      border: mainProjects.includes(proj)
                        ? '1px solid #fecaca'
                        : '1px solid #bfdbfe',
                    }}
                  >
                    {mainProjects.includes(proj) ? 'Work Project' : 'Personal Project'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{proj.period}</span>
                </div>
                <h3
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: '0 0 8px 0',
                  }}
                >
                  {proj.title}
                </h3>
                <ul
                  style={{
                    paddingLeft: '0.8rem',
                    margin: 0,
                    fontSize: '0.7rem',
                    color: '#475569',
                    lineHeight: 1.4,
                  }}
                >
                  {proj.bullets.map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '4px' }}>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                style={{
                  marginTop: '0.8rem',
                  paddingTop: '0.6rem',
                  borderTop: '1px dashed #e2e8f0',
                  fontSize: '0.65rem',
                  color: '#475569',
                }}
              >
                <div>
                  <strong>Tech:</strong> {proj.techStack}
                </div>
                {proj.infraConfig && (
                  <div style={{ marginTop: '2px' }}>
                    <strong>Infra:</strong> {proj.infraConfig}
                  </div>
                )}
                {proj.publishInfo && (
                  <div style={{ marginTop: '2px' }}>
                    <strong>Publish:</strong> {proj.publishInfo}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
