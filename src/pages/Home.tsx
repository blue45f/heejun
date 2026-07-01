import React from 'react'
import { motion } from 'framer-motion'
import { resumeData } from '../data/resumeData'
import {
  Mail,
  Phone,
  Github,
  MapPin,
  Award,
  CheckCircle,
  ArrowRight,
  BookOpen,
  MessageSquare,
} from 'lucide-react'
import { useMotionConfig, REVEAL_VIEWPORT } from '../lib/motion'

export const Home: React.FC = () => {
  const { personalInfo, competencies, selfIntroduction, interviewQnA } = resumeData
  const { container, item, itemLeft, reduced } = useMotionConfig()

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail size={16} className="text-[var(--accent-coral)]" aria-hidden="true" />
      case 'phone':
        return <Phone size={16} className="text-[var(--accent-gold)]" aria-hidden="true" />
      case 'github':
        return <Github size={16} className="text-[var(--accent-cobalt)]" aria-hidden="true" />
      case 'location':
        return <MapPin size={16} className="text-[var(--accent-mint)]" aria-hidden="true" />
      default:
        return <Award size={16} className="text-[var(--text-tertiary)]" aria-hidden="true" />
    }
  }

  const emailContact = personalInfo.contact.find((c) => c.type === 'email')
  const githubContact = personalInfo.contact.find((c) => c.type === 'github')

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-12">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <motion.section
        variants={item}
        className="glass-panel hero-shell hero-section"
        aria-labelledby="hero-name"
      >
        <div className="hero-aurora" aria-hidden="true" />

        <div className="hero-copy">
          <motion.div variants={item} className="hero-eyebrow">
            <span className="pulse-dot" aria-hidden="true" />
            <span>{personalInfo.jobTitle}</span>
          </motion.div>

          <motion.h1 variants={item} id="hero-name" className="hero-name">
            {personalInfo.name}
          </motion.h1>

          <motion.p variants={item} className="hero-role">
            {personalInfo.title}
          </motion.p>

          {/* One clear primary CTA + supporting secondary actions */}
          <motion.div variants={item} className="hero-actions">
            <a className="btn-primary" href="/experience" aria-label="경력 자세히 보기">
              <span>경력 살펴보기</span>
              <ArrowRight size={15} aria-hidden="true" />
            </a>
            {githubContact?.href && (
              <a
                className="btn-secondary"
                href={githubContact.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github size={15} aria-hidden="true" />
                <span>GitHub</span>
              </a>
            )}
            {emailContact?.href && (
              <a className="btn-secondary" href={emailContact.href}>
                <Mail size={15} aria-hidden="true" />
                <span>연락하기</span>
              </a>
            )}
          </motion.div>
        </div>

        {/* Years badge with slow conic ring */}
        <motion.div
          variants={item}
          className="hero-badge"
          whileHover={reduced ? undefined : { scale: 1.04 }}
        >
          <div className="years-ring" aria-hidden="true">
            <div className="years-ring__inner">
              <span className="years-ring__num">{personalInfo.experienceYears}</span>
              <span className="years-ring__cap">Years Exp</span>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* ── Metrics band ───────────────────────────────────────────────── */}
      <motion.section
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={REVEAL_VIEWPORT}
        className="metrics-grid"
        aria-label="주요 성과 지표"
      >
        {personalInfo.metrics.map((metric) => (
          <motion.div key={metric.label} variants={item} tabIndex={0} className="metric-tile">
            <div className="metric-value">{metric.value}</div>
            <div className="metric-label">{metric.label}</div>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Competencies + about ───────────────────────────────────────── */}
      <div className="home-main-grid" style={{ display: 'grid', gap: '2rem' }}>
        {/* Core Competencies */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
          className="space-y-6"
          aria-labelledby="competencies-heading"
        >
          <motion.h2
            variants={item}
            id="competencies-heading"
            className="section-heading"
            style={{ fontSize: '1.5rem' }}
          >
            <span
              className="section-heading__chip"
              style={{ backgroundColor: 'var(--accent-coral)', color: 'var(--accent-coral)' }}
              aria-hidden="true"
            />
            <span>핵심 역량</span>
          </motion.h2>

          <div className="space-y-6">
            {competencies.map((comp) => (
              <motion.div
                key={comp.category}
                variants={item}
                className="glass-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                <h3
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: 'var(--ink-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CheckCircle
                    size={18}
                    style={{ color: 'var(--accent-mint)' }}
                    aria-hidden="true"
                  />
                  <span>{comp.category}</span>
                </h3>
                <ul
                  className="space-y-2"
                  style={{
                    listStyle: 'none',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {comp.bullets.map((bullet, bIdx) => (
                    <li key={bIdx} style={{ paddingLeft: '1rem', position: 'relative' }}>
                      <span
                        aria-hidden="true"
                        style={{ position: 'absolute', left: 0, color: 'var(--accent-coral)' }}
                      >
                        •
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Info & Self Intro */}
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
          className="space-y-6"
          aria-label="연락처 및 자기소개"
        >
          {/* Contact Proof Panel */}
          <motion.div
            variants={itemLeft}
            className="glass-panel"
            style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}
          >
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '1rem',
                color: 'var(--text-primary)',
              }}
            >
              Contact &amp; Proof
            </h3>
            <div className="space-y-3">
              {personalInfo.contact.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-3"
                  style={{ fontSize: '0.875rem' }}
                >
                  {getContactIcon(c.type)}
                  {c.href ? (
                    <a
                      href={c.href}
                      target={c.type === 'github' || c.type === 'study' ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="link-underline"
                      style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}
                    >
                      {c.label}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Self Intro Panel */}
          <motion.div
            variants={itemLeft}
            className="glass-card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <h2 className="section-heading" style={{ fontSize: '1.25rem' }}>
              <span
                className="section-heading__chip"
                style={{
                  backgroundColor: 'var(--accent-cobalt)',
                  color: 'var(--accent-cobalt)',
                  height: '1.25rem',
                }}
                aria-hidden="true"
              />
              <span>자기소개</span>
            </h2>
            <p
              className="prose-measure"
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                whiteSpace: 'pre-line',
              }}
            >
              {selfIntroduction}
            </p>
            <a
              href="/guides"
              className="link-underline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent-cobalt)',
                width: 'fit-content',
              }}
            >
              <BookOpen size={15} aria-hidden="true" />
              <span>개발 가이드 보기</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </motion.div>

          {/* Interview Q&A Panel */}
          {interviewQnA && interviewQnA.length > 0 && (
            <motion.div
              variants={itemLeft}
              className="glass-card"
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <h2 className="section-heading" style={{ fontSize: '1.25rem' }}>
                <span
                  className="section-heading__chip"
                  style={{
                    backgroundColor: 'var(--accent-gold)',
                    color: 'var(--accent-gold)',
                    height: '1.25rem',
                  }}
                  aria-hidden="true"
                />
                <span>Interview Q&A</span>
              </h2>
              <div className="space-y-6">
                {interviewQnA.map((qna, idx) => (
                  <div key={idx} className="space-y-2">
                    <h3
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        gap: '0.5rem',
                      }}
                    >
                      <MessageSquare size={16} className="text-[var(--accent-gold)]" />
                      <span>{qna.question}</span>
                    </h3>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        paddingLeft: '1.5rem',
                        borderLeft: '2px solid var(--surface-glass-border)',
                      }}
                    >
                      {qna.answer}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.section>
      </div>

      <style>{`
        .hero-shell {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          width: fit-content;
          padding: 5px 13px 5px 11px;
          background: var(--raise);
          color: var(--text-primary);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          border-radius: 9999px;
          border: 1px solid var(--surface-glass-border);
        }
        .hero-name {
          margin-top: 1rem;
          font-size: clamp(2.4rem, 6vw, 3.75rem);
          font-weight: 900;
          letter-spacing: -0.035em;
          line-height: 1.05;
          color: var(--text-primary);
          text-wrap: balance;
        }
        .hero-role {
          margin-top: 0.85rem;
          max-width: 34ch;
          font-size: clamp(1rem, 2.4vw, 1.2rem);
          font-weight: 500;
          line-height: 1.55;
          color: var(--text-secondary);
          text-wrap: pretty;
        }
        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.65rem;
          margin-top: 1.6rem;
        }
        .hero-badge { align-self: center; }
        .years-ring__num {
          font-size: clamp(2.1rem, 4vw, 2.6rem);
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }
        .years-ring__cap {
          margin-top: 5px;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }
        .metrics-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .home-main-grid { grid-template-columns: 1fr; }
        .prose-measure { max-width: 68ch; }

        @media (min-width: 768px) {
          .hero-shell {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 2.5rem;
          }
          .hero-copy { max-width: 60%; }
          .hero-badge { align-self: auto; }
          .metrics-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .home-main-grid { grid-template-columns: 2fr 1fr; }
        }
      `}</style>
    </motion.div>
  )
}
