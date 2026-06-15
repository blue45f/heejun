import React from 'react'
import { motion } from 'framer-motion'
import { resumeData } from '../data/resumeData'
import { Mail, Phone, Github, MapPin, Award, CheckCircle } from 'lucide-react'

export const Home: React.FC = () => {
  const { personalInfo, competencies, selfIntroduction } = resumeData

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  }

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail size={16} className="text-[var(--accent-coral)]" />
      case 'phone':
        return <Phone size={16} className="text-[var(--accent-gold)]" />
      case 'github':
        return <Github size={16} className="text-[var(--accent-cobalt)]" />
      case 'location':
        return <MapPin size={16} className="text-[var(--accent-mint)]" />
      default:
        return <Award size={16} className="text-[var(--text-tertiary)]" />
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12"
    >
      {/* Hero Header Section */}
      <section
        className="glass-panel hero-section"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '2.5rem 2rem',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div className="space-y-4" style={{ maxWidth: '650px' }}>
          <motion.div
            variants={itemVariants}
            className="badge"
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: 'var(--raise)',
              color: 'var(--accent-coral)',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '9999px',
              border: '1px solid var(--surface-glass-border)',
            }}
          >
            {personalInfo.jobTitle}
          </motion.div>
          <motion.h1
            variants={itemVariants}
            style={{
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}
          >
            {personalInfo.name}
          </motion.h1>
          <motion.p
            variants={itemVariants}
            style={{
              fontSize: 'clamp(1rem, 3vw, 1.25rem)',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            {personalInfo.title}
          </motion.p>
        </div>

        {/* 18 Years Glow Deco Badge */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.05, rotate: 2 }}
          style={{
            flexShrink: 0,
            alignSelf: 'center',
            width: '9rem',
            height: '9rem',
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, var(--accent-coral), var(--accent-gold), var(--accent-cobalt))',
            padding: '2px',
            boxShadow: '0 10px 25px -5px rgba(217, 83, 79, 0.2)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: 'var(--surface)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}
            >
              {personalInfo.experienceYears}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginTop: '4px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Years Exp
            </span>
          </div>
        </motion.div>
      </section>

      {/* Metrics Banner */}
      <motion.section
        variants={itemVariants}
        className="metrics-grid"
        style={{
          display: 'grid',
          gap: '1rem',
        }}
      >
        {personalInfo.metrics.map((metric, idx) => (
          <div
            key={idx}
            className="glass-card metric-pill"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div className="metric-value">{metric.value}</div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                fontWeight: 500,
                marginTop: '6px',
              }}
            >
              {metric.label}
            </div>
          </div>
        ))}
      </motion.section>

      {/* Grid Layout: Core Competencies & About Me */}
      <div className="home-main-grid" style={{ display: 'grid', gap: '2rem' }}>
        {/* Core Competencies (2/3 width) */}
        <motion.section variants={itemVariants} className="space-y-6">
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              borderBottom: '1px solid var(--line)',
              paddingBottom: '0.5rem',
            }}
          >
            <span
              style={{
                width: '10px',
                height: '1.5rem',
                backgroundColor: 'var(--accent-coral)',
                borderRadius: '4px',
              }}
            ></span>
            <span>핵심 역량</span>
          </h2>

          <div className="space-y-6">
            {competencies.map((comp, idx) => (
              <div
                key={idx}
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
                    className="text-[var(--accent-mint)]"
                    style={{ color: 'var(--accent-mint)' }}
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
                      <span style={{ position: 'absolute', left: 0, color: 'var(--accent-coral)' }}>
                        •
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Info & Self Intro (1/3 width) */}
        <motion.section variants={itemVariants} className="space-y-6">
          {/* Contact Proof Panel */}
          <div
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
              Contact & Proof
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
                      style={{
                        color: 'var(--text-secondary)',
                        wordBreak: 'break-all',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                    >
                      {c.label}
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Self Intro Panel */}
          <div
            className="glass-card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: '1px solid var(--line)',
                paddingBottom: '0.5rem',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '1.25rem',
                  backgroundColor: 'var(--accent-cobalt)',
                  borderRadius: '4px',
                }}
              ></span>
              <span>자기소개</span>
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-line',
              }}
            >
              {selfIntroduction}
            </p>
          </div>
        </motion.section>
      </div>

      <style>{`
        .hero-section {
          flex-direction: column !important;
        }
        .metrics-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .home-main-grid {
          grid-template-columns: 1fr !important;
        }
        @media (min-width: 768px) {
          .hero-section {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
          }
          .hero-section div:first-child {
            max-width: 65% !important;
          }
          .hero-section div:last-child {
            align-self: auto !important;
          }
          .metrics-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          }
          .home-main-grid {
            grid-template-columns: 2fr 1fr !important;
          }
        }
      `}</style>
    </motion.div>
  )
}
