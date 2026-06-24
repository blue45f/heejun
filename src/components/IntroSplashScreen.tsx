import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function IntroSplashScreen() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('has-seen-intro-v3')
    }
    return true
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!isVisible) return

    const timer = setTimeout(() => {
      setIsVisible(false)
      sessionStorage.setItem('has-seen-intro-v3', 'true')
    }, 2800)

    return () => clearTimeout(timer)
  }, [isVisible])

  // Canvas particle system representing the "universe of engineering connections"
  useEffect(() => {
    if (!isVisible) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    // Particles array
    const particles: Array<{
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      color: string
      alpha: number
    }> = []

    const colors = ['rgba(56, 189, 248, ', 'rgba(168, 85, 247, ', 'rgba(236, 72, 153, '] // sky, purple, pink

    // Initialize particles
    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.8,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.3,
      })
    }

    // Animation loop
    const draw = () => {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)' // Dark background with trace
      ctx.fillRect(0, 0, width, height)

      // Move & Draw particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        // Boundary collision/wrap
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        ctx.fillStyle = p.color + p.alpha + ')'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw connection lines
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 120) {
            const alphaVal = (1 - dist / 120) * 0.15
            ctx.strokeStyle = `rgba(168, 85, 247, ${alphaVal})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [isVisible])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(20px)' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 overflow-hidden select-none"
        >
          {/* Canvas Background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 block w-full h-full pointer-events-none"
          />

          {/* 3D perspective space glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.12)_0%,rgba(15,23,42,0)_70%)] pointer-events-none" />

          {/* Luxury 3D Rotating Rings */}
          <div
            className="relative w-72 h-72 flex items-center justify-center"
            style={{ perspective: '800px' }}
          >
            <motion.div
              initial={{ rotateX: 60, rotateY: 0, rotateZ: 0, scale: 0.2, opacity: 0 }}
              animate={{
                rotateX: 65,
                rotateY: [0, 10, -10, 0],
                rotateZ: [0, 360],
                scale: 1,
                opacity: 0.85,
              }}
              transition={{
                rotateZ: { duration: 10, repeat: Infinity, ease: 'linear' },
                rotateY: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 1.8, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 1 },
              }}
              className="absolute w-full h-full rounded-full border-[3px] border-dashed border-sky-400/30"
            />

            <motion.div
              initial={{ rotateX: 45, rotateY: 0, rotateZ: 0, scale: 0.2, opacity: 0 }}
              animate={{
                rotateX: 50,
                rotateY: [0, -15, 15, 0],
                rotateZ: [360, 0],
                scale: 1.15,
                opacity: 0.65,
              }}
              transition={{
                rotateZ: { duration: 8, repeat: Infinity, ease: 'linear' },
                rotateY: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 2.0, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 1.2 },
              }}
              className="absolute w-full h-full rounded-full border-2 border-dotted border-purple-500/40"
            />

            {/* Neon core glow */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 0.9, 0.6] }}
              transition={{
                scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                default: { duration: 1.5, ease: 'easeOut' },
              }}
              className="absolute w-24 h-24 rounded-full bg-sky-500/20 blur-xl"
            />

            {/* Holographic Logo */}
            <motion.svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="z-10 text-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]"
            >
              <defs>
                <linearGradient id="spectrum-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path
                d="M32 4 C16.5 4 4 16.5 4 32 C4 47.5 16.5 60 32 60 C47.5 60 60 47.5 60 32 C60 22 54 13 46 8"
                fill="none"
                stroke="url(#spectrum-grad)"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="200"
                strokeDashoffset="0"
              />
              <path
                d="M32 16 L22 36 L42 36 Z"
                fill="none"
                stroke="url(#spectrum-grad)"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </motion.svg>
          </div>

          {/* Typography */}
          <div className="mt-8 text-center z-10 flex flex-col items-center">
            <motion.h1
              initial={{ letterSpacing: '0.4em', filter: 'blur(10px)', opacity: 0 }}
              animate={{ letterSpacing: '0.12em', filter: 'blur(0px)', opacity: 1 }}
              transition={{ delay: 0.5, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-purple-400 to-pink-400 tracking-[0.12em] select-none"
            >
              Heejun Kim
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 0.7, y: 0 }}
              transition={{ delay: 1.0, duration: 0.8 }}
              className="mt-2 text-[10px] uppercase font-semibold text-slate-400 tracking-[0.3em]"
            >
              Senior Frontend Engineer Portfolio (Beta)
            </motion.p>
          </div>

          {/* Splash bottom line */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: '120px' }}
            transition={{ delay: 0.8, duration: 1.5, ease: 'easeInOut' }}
            className="absolute bottom-16 h-[2px] bg-gradient-to-r from-transparent via-sky-500/40 to-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
