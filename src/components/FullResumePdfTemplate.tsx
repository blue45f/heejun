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
        return <Mail size={11} style={{ color: '#ef4444', marginRight: '4px' }} />
      case 'phone':
        return <Phone size={11} style={{ color: '#fbbf24', marginRight: '4px' }} />
      case 'github':
        return <Github size={11} style={{ color: '#3b82f6', marginRight: '4px' }} />
      case 'location':
        return <MapPin size={11} style={{ color: '#10b981', marginRight: '4px' }} />
      default:
        return <Award size={11} style={{ color: '#64748b', marginRight: '4px' }} />
    }
  }

  // Common Page Styles
  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    padding: '20mm 18mm 15mm 18mm',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: 'var(--sans)',
  }

  const sectionTitleStyle = (_color: string): React.CSSProperties => ({
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#0f172a',
    borderBottom: '1.5px solid #cbd5e1',
    paddingBottom: '0.4rem',
    marginBottom: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    letterSpacing: '-0.02em',
  })

  const dotStyle = (color: string): React.CSSProperties => ({
    width: '6px',
    height: '1rem',
    backgroundColor: color,
    borderRadius: '2px',
    display: 'inline-block',
  })

  const footerStyle = (_pageNum?: number): React.CSSProperties => ({
    fontSize: '0.65rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.5rem',
    marginTop: 'auto',
  })

  // Group competencies bullets to look cleaner
  const formatCompetencyBullets = (bullets: string[]) => {
    // Re-combine oddly broken text segments
    const combined: string[] = []
    let temp = ''
    bullets.forEach((b) => {
      if (b.length < 10 && temp) {
        temp += ' ' + b
        combined.push(temp)
        temp = ''
      } else {
        if (temp) combined.push(temp)
        temp = b
      }
    })
    if (temp) combined.push(temp)
    return combined.slice(0, 5) // limit to top 5 for page fitting
  }

  return (
    <div
      style={{ backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* ==================== PAGE 1: Profile & Competencies ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header */}
          <header
            style={{
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ maxWidth: '75%' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  marginBottom: '2px',
                  letterSpacing: '0.05em',
                }}
              >
                {personalInfo.jobTitle}
              </div>
              <h1
                style={{
                  fontSize: '2.2rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                }}
              >
                {personalInfo.name}{' '}
                <span
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    color: '#64748b',
                    marginLeft: '6px',
                  }}
                >
                  {personalInfo.englishName}
                </span>
              </h1>
              <p
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#475569',
                  marginTop: '6px',
                  lineHeight: 1.4,
                }}
              >
                {personalInfo.title}
              </p>
            </div>

            {/* Experience Glow Badge */}
            <div
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #fbbf24, #3b82f6)',
                padding: '1.5px',
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
                <span
                  style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}
                >
                  {personalInfo.experienceYears}
                </span>
                <span
                  style={{
                    fontSize: '0.4rem',
                    fontWeight: 700,
                    color: '#64748b',
                    marginTop: '1px',
                    letterSpacing: '0.02em',
                  }}
                >
                  YEARS EXP
                </span>
              </div>
            </div>
          </header>

          {/* Contact Details */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 18px',
              fontSize: '0.7rem',
              color: '#475569',
              backgroundColor: '#f8fafc',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #f1f5f9',
            }}
          >
            {personalInfo.contact.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                {getContactIcon(c.type)}
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Core Competencies */}
          <section>
            <h2 style={sectionTitleStyle('#ef4444')}>
              <span style={dotStyle('#ef4444')} />
              핵심 역량
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {competencies.map((comp, idx) => {
                const colors = ['#ef4444', '#3b82f6', '#10b981']
                const accentColor = colors[idx % colors.length]
                return (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: '#0f172a',
                        marginBottom: '0.35rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <CheckCircle size={13} style={{ color: accentColor }} />
                      {comp.category}
                    </h3>
                    <ul
                      style={{
                        paddingLeft: '0.9rem',
                        margin: 0,
                        fontSize: '0.725rem',
                        color: '#475569',
                        lineHeight: 1.45,
                      }}
                    >
                      {formatCompetencyBullets(comp.bullets).map((bullet, bIdx) => (
                        <li key={bIdx} style={{ marginBottom: '3px' }}>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Self Introduction */}
          <section>
            <h2 style={sectionTitleStyle('#3b82f6')}>
              <span style={dotStyle('#3b82f6')} />
              자기소개
            </h2>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#475569',
                lineHeight: 1.55,
                whiteSpace: 'pre-line',
                backgroundColor: 'rgba(59, 130, 246, 0.02)',
                border: '1px solid rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                padding: '0.85rem',
              }}
            >
              {selfIntroduction.split('\n\n').slice(0, 2).join('\n\n')}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer style={footerStyle()}>
          <span>김희준 - Senior Frontend Engineer</span>
          <span style={{ fontWeight: 700 }}>Page 1 / 5</span>
        </footer>
      </div>

      {/* ==================== PAGE 2: Work Experience (Senior Positions) ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={sectionTitleStyle('#10b981')}>
            <span style={dotStyle('#10b981')} />
            Work Experience (시니어 경력 및 성과)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Jarvis & Villains */}
            {experiences.slice(0, 1).map((exp, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Briefcase size={14} style={{ color: '#ef4444' }} />
                    {exp.company}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 650,
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    {exp.period}
                  </span>
                </div>
                <div style={{ fontSize: '0.725rem', color: '#475569', paddingLeft: '1.25rem' }}>
                  <strong style={{ color: '#0f172a' }}>주요 업무:</strong> {exp.tasks.join(', ')}
                </div>
              </div>
            ))}

            {/* 2. Woowahan Bros */}
            {experiences.slice(1, 2).map((exp, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  borderTop: '1px dashed #e2e8f0',
                  paddingTop: '1.25rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Briefcase size={14} style={{ color: '#ef4444' }} />
                    {exp.company}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 650,
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #cbd5e1',
                    }}
                  >
                    {exp.period}
                  </span>
                </div>

                <div>
                  <h4
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      margin: '0 0 4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <ChevronRight size={11} style={{ color: '#fbbf24' }} /> 주요 업무 및 역할
                  </h4>
                  <ul
                    style={{
                      listStyleType: 'disc',
                      listStylePosition: 'inside',
                      paddingLeft: '4px',
                      margin: 0,
                      fontSize: '0.725rem',
                      color: '#475569',
                      lineHeight: 1.45,
                    }}
                  >
                    {exp.tasks.slice(0, 6).map((task, tIdx) => (
                      <li key={tIdx} style={{ marginBottom: '2px' }}>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                {exp.achievements.length > 0 && (
                  <div>
                    <h4
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        margin: '0 0 6px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Award size={11} style={{ color: '#10b981' }} /> 주요 실무 성과
                    </h4>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.4rem',
                      }}
                    >
                      {exp.achievements.slice(0, 6).map((ach, aIdx) => (
                        <div
                          key={aIdx}
                          style={{
                            padding: '5px 7px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                          }}
                        >
                          <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0f172a' }}>
                            {ach.title}
                          </div>
                          <div
                            style={{
                              fontSize: '0.65rem',
                              color: '#64748b',
                              marginTop: '1px',
                              lineHeight: 1.3,
                              whiteSpace: 'pre-line',
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
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#475569',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '6px',
                    }}
                  >
                    <strong>핵심 기술:</strong>{' '}
                    {exp.techStack
                      .split(',')
                      .slice(0, 8)
                      .map((tech, tcIdx) => (
                        <span
                          key={tcIdx}
                          style={{
                            padding: '1px 5px',
                            margin: '0 2px',
                            borderRadius: '3px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.65rem',
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
        </div>

        {/* Footer */}
        <footer style={footerStyle()}>
          <span>김희준 - Senior Frontend Engineer</span>
          <span style={{ fontWeight: 700 }}>Page 2 / 5</span>
        </footer>
      </div>

      {/* ==================== PAGE 3: Work Experience (Mid-level) & Education ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={sectionTitleStyle('#10b981')}>
            <span style={dotStyle('#10b981')} />
            Work Experience & Education (기타 경력 및 학력)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Mid-level Experiences loop */}
            {experiences.slice(2, 6).map((exp, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  borderBottom: '1px dashed #f1f5f9',
                  paddingBottom: '0.6rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#0f172a',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Briefcase size={12} style={{ color: '#ef4444' }} />
                    {exp.company}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      padding: '1px 5px',
                      borderRadius: '4px',
                    }}
                  >
                    {exp.period}
                  </span>
                </div>
                {exp.tasks.length > 0 && (
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      paddingLeft: '1.1rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {exp.tasks.slice(0, 3).map((t, tIdx) => (
                      <div key={tIdx}>• {t}</div>
                    ))}
                  </div>
                )}
                {exp.techStack && (
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', paddingLeft: '1.1rem' }}>
                    <strong>Tech:</strong> {exp.techStack.split(',').slice(0, 5).join(', ')}
                  </div>
                )}
              </div>
            ))}

            {/* Education Section */}
            <div style={{ marginTop: '0.5rem' }}>
              <h2 style={sectionTitleStyle('#3b82f6')}>
                <span style={dotStyle('#3b82f6')} />
                Education & Activities
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  fontSize: '0.725rem',
                  color: '#475569',
                }}
              >
                <div
                  style={{
                    padding: '0.6rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    학력 사항
                  </strong>
                  • 충북대학교 컴퓨터공학과 학사 졸업
                  <br />• 정보처리기사 자격 취득
                </div>
                <div
                  style={{
                    padding: '0.6rem',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                    주요 대외 활동
                  </strong>
                  • 2025 전사 웹표준 가이드 TF 리더
                  <br />• 모던 프론트엔드 테크 밋업 연사 참여
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={footerStyle()}>
          <span>김희준 - Senior Frontend Engineer</span>
          <span style={{ fontWeight: 700 }}>Page 3 / 5</span>
        </footer>
      </div>

      {/* ==================== PAGE 4: Project Ledger (Work Projects) ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h2 style={sectionTitleStyle('#fbbf24')}>
            <span style={dotStyle('#fbbf24')} />
            Project Ledger (실무 대표 프로젝트)
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
            {/* Top 3 main projects (1열 배치로 겹침 방지) */}
            {mainProjects.slice(0, 3).map((proj, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {proj.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.625rem',
                      color: '#64748b',
                      backgroundColor: '#f1f5f9',
                      padding: '1px 5px',
                      borderRadius: '3px',
                    }}
                  >
                    {proj.period}
                  </span>
                </div>
                <ul
                  style={{
                    paddingLeft: '0.9rem',
                    margin: 0,
                    fontSize: '0.7rem',
                    color: '#475569',
                    lineHeight: 1.4,
                  }}
                >
                  {proj.bullets.slice(0, 4).map((b, bIdx) => (
                    <li key={bIdx} style={{ marginBottom: '2px' }}>
                      {b}
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: '#475569',
                    borderTop: '1px dashed #f1f5f9',
                    paddingTop: '4px',
                    marginTop: '2px',
                  }}
                >
                  <strong>Tech:</strong> {proj.techStack}
                  {proj.infraConfig && (
                    <span>
                      {' '}
                      | <strong>Infra:</strong> {proj.infraConfig}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={footerStyle()}>
          <span>김희준 - Senior Frontend Engineer</span>
          <span style={{ fontWeight: 700 }}>Page 4 / 5</span>
        </footer>
      </div>

      {/* ==================== PAGE 5: Personal Projects & Tech Stack ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Personal Projects */}
          <section>
            <h2 style={sectionTitleStyle('#fbbf24')}>
              <span style={dotStyle('#fbbf24')} />
              Open Source & Personal Projects
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {personalProjects.slice(0, 2).map((proj, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.75rem',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <h3
                      style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a', margin: 0 }}
                    >
                      {proj.title}
                    </h3>
                    <span style={{ fontSize: '0.625rem', color: '#64748b' }}>{proj.period}</span>
                  </div>
                  <ul
                    style={{
                      paddingLeft: '0.85rem',
                      margin: 0,
                      fontSize: '0.7rem',
                      color: '#475569',
                      lineHeight: 1.4,
                    }}
                  >
                    {proj.bullets.slice(0, 3).map((b, bIdx) => (
                      <li key={bIdx} style={{ marginBottom: '2px' }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#64748b',
                      borderTop: '1px dashed #e2e8f0',
                      paddingTop: '4px',
                    }}
                  >
                    <strong>Tech:</strong> {proj.techStack}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Tech Stack Summary */}
          <section>
            <h2 style={sectionTitleStyle('#3b82f6')}>
              <span style={dotStyle('#3b82f6')} />
              Technical Skill Stack (기술 분류)
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                fontSize: '0.7rem',
              }}
            >
              <div
                style={{
                  padding: '0.6rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  Frontend Core
                </strong>
                React 19, TypeScript, JavaScript (ES6+), Next.js, React Query, Zustand, Redux, MobX,
                HTML5, CSS3/SCSS
              </div>
              <div
                style={{
                  padding: '0.6rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                }}
              >
                <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                  DevOps & Build Tools
                </strong>
                Vite, Webpack, Vitest, Jest, Cypress, AWS (S3, CloudFront, Route53), CI/CD (GitHub
                Actions, Jenkins), Docker
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer style={footerStyle()}>
          <span>김희준 - Senior Frontend Engineer</span>
          <span style={{ fontWeight: 700 }}>Page 5 / 5</span>
        </footer>
      </div>
    </div>
  )
}
