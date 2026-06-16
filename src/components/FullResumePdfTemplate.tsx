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
  } = resumeData

  // Common A4 Page Styles - Clean minimalist print theme
  const pageStyle: React.CSSProperties = {
    width: '210mm',
    height: '297mm',
    padding: '22mm 20mm 18mm 20mm',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--sans)',
    color: '#334155', // Slate 700 (body)
    lineHeight: 1.5,
  }

  const sectionHeaderStyle = (_title: string): React.CSSProperties => ({
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0f172a', // Slate 900
    borderBottom: '1.5px solid #0f172a',
    paddingBottom: '4px',
    marginTop: '0rem',
    marginBottom: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '-0.01em',
  })

  const footerStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '0.5rem',
    marginTop: 'auto',
  }

  return (
    <div
      style={{ backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* ==================== PAGE 1: Profile, Competencies, Intro ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header (Minimalist Standard Resume Style) */}
          <header
            style={{
              textAlign: 'center',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <h1
              style={{
                fontSize: '2.4rem',
                fontWeight: 800,
                color: '#0f172a',
                margin: '0 0 6px 0',
                letterSpacing: '-0.03em',
              }}
            >
              {personalInfo.name}
            </h1>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '8px',
              }}
            >
              {personalInfo.jobTitle}
            </div>
            {/* Contact links separated by pipes */}
            <div
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'flex',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '8px 12px',
              }}
            >
              <span>✉ {personalInfo.contact[0].label}</span>
              <span>|</span>
              <span>📞 {personalInfo.contact[1].label}</span>
              <span>|</span>
              <span>🔗 {personalInfo.contact[2].label}</span>
              <span>|</span>
              <span>📍 {personalInfo.contact[4].label}</span>
            </div>
          </header>

          {/* Short Bio / Executive Summary */}
          <section>
            <div
              style={{
                fontSize: '0.8rem',
                color: '#1e293b',
                fontWeight: 600,
                lineHeight: 1.5,
                marginBottom: '6px',
              }}
            >
              🎯 {personalInfo.title}
            </div>
            <p
              style={{
                fontSize: '0.75rem',
                color: '#475569',
                margin: 0,
                lineHeight: 1.6,
                textAlign: 'justify',
              }}
            >
              {selfIntroduction}
            </p>
          </section>

          {/* Key Competencies (Flat Bullet List, No Cards) */}
          <section>
            <div style={sectionHeaderStyle('핵심 역량')}></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {competencies.map((comp, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    ▪ {comp.category}
                  </h3>
                  <ul
                    style={{
                      paddingLeft: '1.2rem',
                      margin: 0,
                      fontSize: '0.725rem',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    {comp.bullets.slice(0, 4).map((bullet, bIdx) => (
                      <li key={bIdx} style={{ marginBottom: '2px' }}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Page Footer */}
        <footer style={footerStyle}>
          <span>이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 1 / 4</span>
        </footer>
      </div>

      {/* ==================== PAGE 2: Work Experience (Jarvis & Woowahan) ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={sectionHeaderStyle('경력 사항')}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 1. Jarvis & Villains */}
            {experiences.slice(0, 1).map((exp, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '3px',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {exp.company}
                  </span>
                  <span
                    style={{ fontSize: '0.725rem', color: '#475569', fontFamily: 'var(--mono)' }}
                  >
                    {exp.period}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
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
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid #f1f5f9',
                    paddingBottom: '3px',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {exp.company}
                  </span>
                  <span
                    style={{ fontSize: '0.725rem', color: '#475569', fontFamily: 'var(--mono)' }}
                  >
                    {exp.period}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#1e293b',
                      marginBottom: '4px',
                    }}
                  >
                    [주요 업무 및 역할]
                  </div>
                  <ul
                    style={{
                      paddingLeft: '1.1rem',
                      margin: 0,
                      fontSize: '0.725rem',
                      color: '#475569',
                      lineHeight: 1.5,
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
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        marginBottom: '4px',
                      }}
                    >
                      [주요 실무 성과]
                    </div>
                    <ul
                      style={{
                        paddingLeft: '1.1rem',
                        margin: 0,
                        fontSize: '0.725rem',
                        color: '#475569',
                        lineHeight: 1.5,
                      }}
                    >
                      {exp.achievements.slice(0, 5).map((ach, aIdx) => (
                        <li key={aIdx} style={{ marginBottom: '3px' }}>
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
                      fontSize: '0.675rem',
                      color: '#475569',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: '6px',
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
        <footer style={footerStyle}>
          <span>이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 2 / 4</span>
        </footer>
      </div>

      {/* ==================== PAGE 3: Work Experience (Other Positions) & Education & Tech Stack ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={sectionHeaderStyle('기타 경력 사항 및 학력')}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {/* Mid-level Experiences (Flat list) */}
            {experiences.slice(2, 6).map((exp, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    • {exp.company}
                  </span>
                  <span
                    style={{ fontSize: '0.675rem', color: '#64748b', fontFamily: 'var(--mono)' }}
                  >
                    {exp.period}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#475569',
                    paddingLeft: '1rem',
                    lineHeight: 1.4,
                  }}
                >
                  {exp.tasks.slice(0, 2).join(' / ')}
                </div>
              </div>
            ))}

            {/* Academic & Qualifications */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={sectionHeaderStyle('학력 및 자격 사항')}></div>
              <ul
                style={{
                  paddingLeft: '1.1rem',
                  margin: 0,
                  fontSize: '0.725rem',
                  color: '#475569',
                  lineHeight: 1.55,
                }}
              >
                <li>충북대학교 컴퓨터공학과 학사 졸업 (2000.03 - 2007.02)</li>
                <li>정보처리기사 취득 (한국산업인력공단)</li>
                <li>SCJP (Sun Certified Java Programmer) 취득</li>
              </ul>
            </div>

            {/* Technical Skills Overview (Flat categorization) */}
            <div style={{ marginTop: '0.5rem' }}>
              <div style={sectionHeaderStyle('보유 기술 요약')}></div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.7rem',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                <div>
                  <strong style={{ color: '#0f172a' }}>▪ Frontend:</strong> React 19, Next.js,
                  TypeScript, JavaScript (ES6+), React Query, Zustand, Redux, MobX, HTML5, CSS3,
                  SCSS, Framer Motion
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>▪ Testing & Build:</strong> Vitest, Jest,
                  Cypress, Vite, Webpack, Babel, ESLint, Prettier
                </div>
                <div>
                  <strong style={{ color: '#0f172a' }}>▪ DevOps & Tools:</strong> AWS (S3,
                  CloudFront, Route53), Git, GitHub Actions, Jenkins, Docker, SonarQube
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <footer style={footerStyle}>
          <span>이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 3 / 4</span>
        </footer>
      </div>

      {/* ==================== PAGE 4: Project Ledger ==================== */}
      <div className="pdf-page" style={pageStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={sectionHeaderStyle('대표 프로젝트 수행 이력')}></div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Combined Main & Personal Projects Selection (Flat clean list) */}
            {[...mainProjects.slice(0, 3), ...personalProjects.slice(0, 1)].map((proj, idx) => (
              <div
                key={idx}
                style={{
                  borderBottom: idx < 3 ? '1px dashed #e2e8f0' : 'none',
                  paddingBottom: idx < 3 ? '0.75rem' : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                    ▪ {proj.title}
                  </span>
                  <span
                    style={{ fontSize: '0.675rem', color: '#64748b', fontFamily: 'var(--mono)' }}
                  >
                    {proj.period}
                  </span>
                </div>
                <ul
                  style={{
                    paddingLeft: '1.1rem',
                    margin: '2px 0',
                    fontSize: '0.7rem',
                    color: '#475569',
                    lineHeight: 1.45,
                  }}
                >
                  {proj.bullets.slice(0, 3).map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
                <div style={{ fontSize: '0.65rem', color: '#64748b', paddingLeft: '1.1rem' }}>
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
        </div>

        {/* Page Footer */}
        <footer style={footerStyle}>
          <span>이력서 - {personalInfo.name}</span>
          <span style={{ fontWeight: 700 }}>Page 4 / 4</span>
        </footer>
      </div>
    </div>
  )
}
