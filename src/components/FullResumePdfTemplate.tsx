import React from 'react'
import { resumeData } from '../data/resumeData'

export const FullResumePdfTemplate: React.FC = () => {
  const {
    personalInfo,
    competencies,
    selfIntroduction,
    experiences,
    mainProjects,
    personalProjects,
    guides,
    leadership,
  } = resumeData

  // Common A4 Page Styles - Clean minimalist print theme
  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    padding: '20mm 20mm 15mm 20mm',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--sans)',
    color: '#334155', // Slate 700 (body)
    lineHeight: 1.45,
  }

  const sectionHeaderStyle = (): React.CSSProperties => ({
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#0f172a', // Slate 900
    borderBottom: '1.5px solid #0f172a',
    paddingBottom: '3px',
    marginTop: '0rem',
    marginBottom: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '-0.01em',
  })

  const footerStyle = (): React.CSSProperties => ({
    fontSize: '0.65rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '0.5rem',
    marginTop: 'auto',
  })

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }
  const PERSONAL_PER_PAGE = 4
  const personalPages = chunk(personalProjects, PERSONAL_PER_PAGE)
  // pages 1-3 (profile/experience) + 4 (work projects) + N personal gallery + 1 guides
  const TOTAL_PAGES = 4 + personalPages.length + 1

  return (
    <div
      style={{ backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* ==================== PAGE 1: Profile, Competencies, Intro, Tech Stack ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Header */}
          <header
            style={{
              textAlign: 'center',
              paddingBottom: '1.2rem',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <h1
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 4px 0',
                letterSpacing: '-0.03em',
              }}
            >
              {personalInfo.name}
            </h1>
            <div
              style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}
            >
              {personalInfo.jobTitle}
            </div>
            {/* Contact links with direct resume URL included */}
            <div
              style={{
                fontSize: '0.725rem',
                color: '#64748b',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '6px 12px',
              }}
            >
              <span>✉ {personalInfo.contact[0].label}</span>
              <span>|</span>
              <span>📞 {personalInfo.contact[1].label}</span>
              <span>|</span>
              <span>🔗 {personalInfo.contact[2].label}</span>
              <span>|</span>
              <span style={{ fontWeight: 700, color: '#1e3a8a' }}>
                🌐 웹사이트: https://heejun.store
              </span>
              <span>|</span>
              <span>📍 {personalInfo.contact[4].label}</span>
            </div>
          </header>

          {/* Short Bio */}
          <section>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#1e293b',
                fontWeight: 650,
                lineHeight: 1.4,
                marginBottom: '4px',
              }}
            >
              🎯 {personalInfo.title}
            </div>
            <p
              style={{
                fontSize: '0.7rem',
                color: '#475569',
                margin: 0,
                lineHeight: 1.5,
                textAlign: 'justify',
              }}
            >
              {selfIntroduction}
            </p>
          </section>

          {/* Key Competencies */}
          <section>
            <div style={sectionHeaderStyle()}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {competencies.map((comp, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    ▪ {comp.category}
                  </h3>
                  <ul
                    style={{
                      paddingLeft: '1.1rem',
                      margin: 0,
                      fontSize: '0.675rem',
                      color: '#475569',
                      lineHeight: 1.45,
                    }}
                  >
                    {comp.bullets.slice(0, 4).map((bullet, bIdx) => (
                      <li key={bIdx} style={{ marginBottom: '1px' }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Technical Skills Overview */}
          <section>
            <div style={sectionHeaderStyle()}></div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                fontSize: '0.675rem',
                color: '#475569',
                lineHeight: 1.45,
              }}
            >
              <div>
                <strong style={{ color: '#0f172a' }}>▪ Frontend:</strong> React 19, Next.js,
                TypeScript, JavaScript (ES6+), React Query, Zustand, Redux, MobX, HTML5, CSS3, SCSS,
                Framer Motion
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>▪ Testing & Build:</strong> Vitest, Jest,
                Cypress, Vite, Webpack, Babel, ESLint, Prettier
              </div>
              <div>
                <strong style={{ color: '#0f172a' }}>▪ DevOps & Tools:</strong> AWS (S3, CloudFront,
                Route53), Git, GitHub Actions, Jenkins, Docker, SonarQube
              </div>
            </div>
          </section>
        </div>

        {/* Page Footer */}
        <footer style={footerStyle()}>
          <span>웹사이트: https://heejun.store | 이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 1 / {TOTAL_PAGES}</span>
        </footer>
      </div>

      {/* ==================== PAGE 2: Work Experience (Senior Positions) ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={sectionHeaderStyle()}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* 1. Jarvis & Villains */}
            {experiences.slice(0, 1).map((exp, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '2px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {exp.company}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'var(--mono)' }}>
                    {exp.period}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.725rem',
                    color: '#475569',
                    marginTop: '2px',
                    paddingLeft: '4px',
                  }}
                >
                  • {exp.tasks.join(', ')}
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
                  gap: '0.6rem',
                  borderTop: '1px dashed #e2e8f0',
                  paddingTop: '0.8rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '2px',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                    {exp.company}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'var(--mono)' }}>
                    {exp.period}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      marginBottom: '2px',
                    }}
                  >
                    [주요 업무 및 역할]
                  </div>
                  <ul
                    style={{
                      paddingLeft: '1.1rem',
                      margin: 0,
                      fontSize: '0.7rem',
                      color: '#475569',
                      lineHeight: 1.4,
                    }}
                  >
                    {exp.tasks.slice(0, 6).map((task, tIdx) => (
                      <li key={tIdx} style={{ marginBottom: '1px' }}>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                {exp.achievements.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '2px',
                      }}
                    >
                      [주요 실무 성과]
                    </div>
                    <ul
                      style={{
                        paddingLeft: '1.1rem',
                        margin: 0,
                        fontSize: '0.7rem',
                        color: '#475569',
                        lineHeight: 1.4,
                      }}
                    >
                      {exp.achievements.slice(0, 5).map((ach, aIdx) => (
                        <li key={aIdx} style={{ marginBottom: '2px' }}>
                          <strong style={{ color: '#0f172a' }}>{ach.title}</strong>:{' '}
                          {ach.desc.replace(/\n\s+/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {exp.techStack && (
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#64748b',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '4px',
                    }}
                  >
                    <strong>사용 기술:</strong> {exp.techStack}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Page Footer */}
        <footer style={footerStyle()}>
          <span>웹사이트: https://heejun.store | 이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 2 / {TOTAL_PAGES}</span>
        </footer>
      </div>

      {/* ==================== PAGE 3: Work Experience (Mid-level) & Education & Leadership ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={sectionHeaderStyle()}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* Mid-level Experiences (Flat list) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {experiences.slice(2, 6).map((exp, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                    }}
                  >
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#0f172a' }}>
                      • {exp.company}
                    </span>
                    <span
                      style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'var(--mono)' }}
                    >
                      {exp.period}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.675rem',
                      color: '#475569',
                      paddingLeft: '0.85rem',
                      lineHeight: 1.35,
                    }}
                  >
                    {exp.tasks.slice(0, 2).join(' / ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Leadership & Activities */}
            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '4px',
                }}
              >
                [조직 기여 및 리더십 이력]
              </div>
              <ul
                style={{
                  paddingLeft: '1.1rem',
                  margin: 0,
                  fontSize: '0.675rem',
                  color: '#475569',
                  lineHeight: 1.45,
                }}
              >
                {leadership.map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '2px' }}>
                    <strong style={{ color: '#0f172a' }}>{item.title}</strong>:{' '}
                    {item.bullets.join(' ')}
                  </li>
                ))}
              </ul>
            </div>

            {/* Academic & Qualifications */}
            <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.6rem' }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '3px',
                }}
              >
                [학력 및 자격 사항]
              </div>
              <ul
                style={{
                  paddingLeft: '1.1rem',
                  margin: 0,
                  fontSize: '0.675rem',
                  color: '#475569',
                  lineHeight: 1.45,
                }}
              >
                <li>충북대학교 컴퓨터공학과 학사 졸업 (2000.03 - 2007.02)</li>
                <li>정보처리기사 취득 (한국산업인력공단, 2006.06)</li>
                <li>SCJP (Sun Certified Java Programmer) 자격 취득</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <footer style={footerStyle()}>
          <span>웹사이트: https://heejun.store | 이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 3 / {TOTAL_PAGES}</span>
        </footer>
      </div>

      {/* ==================== PAGE 4: Project Ledger (Work Projects) ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={sectionHeaderStyle()}></div>

          {/* Top 3 main projects detailed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {mainProjects.slice(0, 3).map((proj, idx) => (
              <div
                key={idx}
                style={{
                  borderBottom: '1px dashed #e2e8f0',
                  paddingBottom: '0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    ▪ {proj.title}
                  </span>
                  <span
                    style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'var(--mono)' }}
                  >
                    {proj.period}
                  </span>
                </div>
                <ul
                  style={{
                    paddingLeft: '1.1rem',
                    margin: '2px 0',
                    fontSize: '0.675rem',
                    color: '#475569',
                    lineHeight: 1.4,
                  }}
                >
                  {proj.bullets.slice(0, 3).map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
                <div style={{ fontSize: '0.625rem', color: '#64748b', paddingLeft: '1.1rem' }}>
                  <strong>Tech Stack:</strong> {proj.techStack}
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

          {/* Remaining Work Projects (Compact Table List to prevent data cutoff) */}
          <div style={{ marginTop: '0.2rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '4px',
              }}
            >
              [기타 실무 프로젝트 이력]
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                fontSize: '0.625rem',
                color: '#475569',
              }}
            >
              {mainProjects.slice(3).map((proj, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f8fafc',
                    paddingBottom: '2px',
                  }}
                >
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '65%',
                    }}
                  >
                    • <strong style={{ color: '#334155' }}>{proj.title}</strong>
                  </span>
                  <span style={{ color: '#64748b', fontFamily: 'var(--mono)', fontSize: '0.6rem' }}>
                    {proj.period} | Tech: {proj.techStack?.split(',').slice(0, 3).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <footer style={footerStyle()}>
          <span>웹사이트: https://heejun.store | 이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 4 / {TOTAL_PAGES}</span>
        </footer>
      </div>

      {/* ==================== PAGES 5..N: Personal Project Gallery (snapshots + detail) ==================== */}
      {personalPages.map((group, pageIdx) => (
        <div className="pdf-page" style={pageStyle} key={`pp-${pageIdx}`}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div style={sectionHeaderStyle()}>
              개인 프로젝트 · 오픈소스
              {personalPages.length > 1 ? ` (${pageIdx + 1} / ${personalPages.length})` : ''}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridAutoRows: '1fr',
                gap: '6mm 7mm',
                flex: 1,
                minHeight: 0,
              }}
            >
              {group.map((proj, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '7px',
                    overflow: 'hidden',
                  }}
                >
                  {proj.image && (
                    <img
                      src={proj.image}
                      alt={`${proj.title} 스냅샷`}
                      style={{
                        width: '100%',
                        aspectRatio: '1280 / 800',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        display: 'block',
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      lineHeight: 1.25,
                    }}
                  >
                    {proj.title}
                  </div>
                  <div style={{ fontSize: '0.56rem', color: '#64748b', fontFamily: 'var(--mono)' }}>
                    {proj.period}
                  </div>
                  <ul
                    style={{
                      paddingLeft: '0.85rem',
                      margin: '1px 0',
                      fontSize: '0.6rem',
                      color: '#475569',
                      lineHeight: 1.32,
                    }}
                  >
                    {proj.bullets.slice(0, 3).map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                  <div
                    style={{
                      fontSize: '0.55rem',
                      color: '#64748b',
                      marginTop: 'auto',
                      lineHeight: 1.3,
                    }}
                  >
                    <strong style={{ color: '#334155' }}>Tech:</strong> {proj.techStack}
                  </div>
                  {proj.links && proj.links.length > 0 && (
                    <div style={{ fontSize: '0.55rem', color: '#2563eb', lineHeight: 1.3 }}>
                      {proj.links.map((l, lIdx) => (
                        <span key={lIdx}>
                          {lIdx > 0 ? '  ·  ' : ''}
                          {l.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <footer style={footerStyle()}>
            <span>웹사이트: https://heejun.store | 이력서 - {personalInfo.name}</span>
            <span style={{ fontWeight: 700 }}>
              Page {4 + pageIdx + 1} / {TOTAL_PAGES}
            </span>
          </footer>
        </div>
      ))}

      {/* ==================== LAST PAGE: Developer Guide Books ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div style={sectionHeaderStyle()}>사내 기술 표준 개발 가이드북 이력 (31종 전체)</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 14px',
              fontSize: '0.66rem',
              color: '#475569',
              lineHeight: 1.4,
            }}
          >
            {guides.map((g, idx) => (
              <div
                key={idx}
                style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                <strong style={{ color: '#0f172a', marginRight: '3px' }}>#{g.id}</strong> {g.name}
              </div>
            ))}
          </div>
        </div>

        <footer style={footerStyle()}>
          <span>웹사이트: https://heejun.store | 이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>
            Page {TOTAL_PAGES} / {TOTAL_PAGES}
          </span>
        </footer>
      </div>
    </div>
  )
}
