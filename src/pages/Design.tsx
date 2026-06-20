const swatches = [
  { name: 'Coral', value: 'var(--accent-coral)' },
  { name: 'Cobalt', value: 'var(--accent-cobalt)' },
  { name: 'Surface', value: 'var(--surface)' },
  { name: 'Text', value: 'var(--text-primary)' },
]

export function Design() {
  return (
    <section className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--accent-coral)', fontWeight: 800, fontSize: '0.75rem' }}>
          BETA Design System
        </p>
        <h1 style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>디자인 시스템</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          포트폴리오의 대비, 표면, 버튼, PDF 출력까지 같은 토큰을 쓰는지 확인하는 리빙 가이드입니다.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {swatches.map((swatch) => (
          <article key={swatch.name} className="card" style={{ padding: '1rem' }}>
            <div
              aria-hidden="true"
              style={{
                height: '5rem',
                borderRadius: 'var(--radius-md)',
                background: swatch.value,
                border: '1px solid var(--line-soft)',
                marginBottom: '0.75rem',
              }}
            />
            <strong>{swatch.name}</strong>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {swatch.value}
            </p>
          </article>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <h2 style={{ marginBottom: '0.75rem' }}>컴포넌트 기준</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button type="button" className="btn-primary">
            Primary action
          </button>
          <span className="nav-link active">Active nav</span>
          <span className="nav-link">Default nav</span>
        </div>
      </div>
    </section>
  )
}
