import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { resumeData } from '../data/resumeData'
import { ChevronDown } from 'lucide-react'
import { useMotionConfig, REVEAL_VIEWPORT } from '../lib/motion'

export const InterviewQnA: React.FC = () => {
  const { interviewQnA } = resumeData
  const qnaList = interviewQnA ?? []
  const { container, item } = useMotionConfig()
  const [openQnaIndexes, setOpenQnaIndexes] = useState<number[]>([0])

  const toggleQna = (idx: number) => {
    setOpenQnaIndexes((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    )
  }
  const allQnaOpen = qnaList.length > 0 && openQnaIndexes.length === qnaList.length
  const toggleAllQna = () => setOpenQnaIndexes(allQnaOpen ? [] : qnaList.map((_, i) => i))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <section className="space-y-3">
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Interview Q&A
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '500px' }}>
          실제 기술 면접에서 받은 핵심 질문 {qnaList.length}개에 미리 정리해 둔 답변입니다. 질문을
          눌러 펼치면 자세한 내용을 확인할 수 있습니다.
        </p>
      </section>

      {qnaList.length > 0 && (
        <motion.section
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={REVEAL_VIEWPORT}
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          aria-label="Interview Q&A"
        >
          <div className="qna-panel-head">
            <span className="qna-count">{qnaList.length}문항</span>
            <button
              type="button"
              className="qna-toggle-all link-underline"
              onClick={toggleAllQna}
              aria-label={allQnaOpen ? '모든 답변 접기' : '모든 답변 펼치기'}
            >
              {allQnaOpen ? '모두 접기' : '모두 펼치기'}
            </button>
          </div>

          <div className="qna-list">
            {qnaList.map((qna, idx) => {
              const isOpen = openQnaIndexes.includes(idx)
              const questionId = `qna-question-${idx}`
              const panelId = `qna-panel-${idx}`
              return (
                <motion.div key={idx} variants={item} className="qna-item" data-open={isOpen}>
                  <h2 className="qna-heading">
                    <button
                      type="button"
                      id={questionId}
                      className="qna-trigger"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleQna(idx)}
                    >
                      <span className="qna-index" aria-hidden="true">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="qna-question-text">{qna.question}</span>
                      <ChevronDown size={18} className="qna-chevron" aria-hidden="true" />
                    </button>
                  </h2>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={questionId}
                    aria-hidden={!isOpen}
                    className="qna-panel"
                  >
                    <div className="qna-panel-inner">
                      <p className="qna-answer">{qna.answer}</p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.section>
      )}

      <style>{`
        .qna-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          border-bottom: 1px solid var(--line);
          padding-bottom: 0.6rem;
        }
        .qna-count {
          display: inline-flex;
          align-items: center;
          padding: 0.15rem 0.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--raise);
          border-radius: 9999px;
        }
        .qna-toggle-all {
          flex-shrink: 0;
          padding: 0.2rem 0.1rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
        }
        .qna-toggle-all:hover,
        .qna-toggle-all:focus-visible {
          color: var(--accent-cobalt);
        }
        .qna-list {
          display: flex;
          flex-direction: column;
        }
        .qna-item {
          border-bottom: 1px solid var(--line-soft);
        }
        .qna-item:last-child {
          border-bottom: none;
        }
        .qna-heading {
          margin: 0;
        }
        .qna-trigger {
          display: flex;
          align-items: flex-start;
          width: 100%;
          gap: 0.75rem;
          margin: 0 -0.6rem;
          padding: 0.9rem 0.6rem;
          background: none;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-align: left;
          font: inherit;
          color: var(--text-primary);
          transition: background-color 0.2s ease;
        }
        .qna-trigger:hover {
          background: var(--raise);
        }
        .qna-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 1.65rem;
          height: 1.65rem;
          margin-top: 0.05rem;
          border-radius: var(--radius-sm);
          background: color-mix(in srgb, var(--accent-gold) 18%, transparent);
          color: var(--text-primary);
          font-size: 0.68rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .qna-question-text {
          flex: 1;
          padding-top: 0.15rem;
          font-size: 0.95rem;
          font-weight: 700;
          line-height: 1.45;
        }
        .qna-chevron {
          flex-shrink: 0;
          margin-top: 0.3rem;
          color: var(--text-tertiary);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;
        }
        .qna-trigger:hover .qna-chevron {
          color: var(--accent-cobalt);
        }
        .qna-item[data-open='true'] .qna-chevron {
          color: var(--accent-cobalt);
          transform: rotate(180deg);
        }
        .qna-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .qna-item[data-open='true'] .qna-panel {
          grid-template-rows: 1fr;
        }
        .qna-panel-inner {
          overflow: hidden;
        }
        .qna-answer {
          margin: 0 0 1.1rem calc(1.65rem + 0.75rem);
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.7;
          white-space: pre-line;
          opacity: 0;
          transition: opacity 0.25s ease;
        }
        .qna-item[data-open='true'] .qna-answer {
          opacity: 1;
          transition-delay: 0.08s;
        }
      `}</style>
    </motion.div>
  )
}
