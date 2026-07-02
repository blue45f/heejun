import { Link } from 'react-router-dom'
import { FileText, Briefcase, Grid, BookOpen, MessageSquare, Palette } from 'lucide-react'

const routes = [
  { path: '/', label: '소개', description: '프로필, 핵심 역량, 요약 이력', icon: FileText },
  {
    path: '/experience',
    label: '경력',
    description: '회사별 역할과 성과 중심 타임라인',
    icon: Briefcase,
  },
  { path: '/projects', label: '프로젝트', description: '주요 포트폴리오와 기술 스택', icon: Grid },
  { path: '/guides', label: '가이드', description: '개발·협업·운영 기준 문서', icon: BookOpen },
  {
    path: '/interview',
    label: 'Interview Q&A',
    description: '기술 면접 핵심 질문과 답변',
    icon: MessageSquare,
  },
  {
    path: '/design',
    label: '디자인 시스템',
    description: '컬러, 표면, 버튼, 모션 기준',
    icon: Palette,
  },
]

export function Sitemap() {
  return (
    <section className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--accent-coral)', fontWeight: 800, fontSize: '0.75rem' }}>
          BETA Sitemap
        </p>
        <h1 style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>사이트맵</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          이력서, 프로젝트, 가이드, 디자인 시스템까지 주요 페이지를 한 화면에 정리했습니다.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        {routes.map((route) => {
          const Icon = route.icon
          return (
            <Link
              key={route.path}
              to={route.path}
              className="card"
              style={{
                display: 'grid',
                gap: '0.75rem',
                padding: '1.25rem',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <Icon size={20} style={{ color: 'var(--accent-coral)' }} />
              <strong>{route.label}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {route.description}
              </span>
              <code style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                {route.path}
              </code>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
