import React, { useEffect, useRef } from 'react'

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let particles: Particle[] = []
    const particleCount = 60

    // Mouse coords
    const mouse = {
      x: null as number | null,
      y: null as number | null,
      radius: 120,
    }

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      baseSize: number
      size: number
      color: string

      constructor() {
        this.x = Math.random() * (canvas?.width || window.innerWidth)
        this.y = Math.random() * (canvas?.height || window.innerHeight)
        this.vx = (Math.random() - 0.5) * 0.4
        this.vy = (Math.random() - 0.5) * 0.4
        this.baseSize = Math.random() * 2 + 1
        this.size = this.baseSize
        this.color = ''
        this.updateColor()
      }

      updateColor() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        if (isDark) {
          // Soft cyan, cobalt, gold, mint for dark mode
          const colors = [
            'rgba(116, 192, 252, 0.25)',
            'rgba(182, 224, 255, 0.2)',
            'rgba(240, 201, 133, 0.15)',
            'rgba(163, 218, 203, 0.2)',
          ]
          this.color = colors[Math.floor(Math.random() * colors.length)]
        } else {
          // Petrol, coral, cobalt for light mode
          const colors = [
            'rgba(31, 58, 68, 0.1)',
            'rgba(170, 59, 255, 0.08)',
            'rgba(92, 102, 212, 0.08)',
            'rgba(217, 83, 79, 0.06)',
          ]
          this.color = colors[Math.floor(Math.random() * colors.length)]
        }
      }

      update() {
        this.x += this.vx
        this.y += this.vy

        // Boundary bounce
        if (canvas) {
          if (this.x < 0 || this.x > canvas.width) this.vx *= -1
          if (this.y < 0 || this.y > canvas.height) this.vy *= -1
        }

        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x
          const dy = this.y - mouse.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < mouse.radius) {
            // Push away gently
            const force = (mouse.radius - distance) / mouse.radius
            const angle = Math.atan2(dy, dx)
            this.x += Math.cos(angle) * force * 1.5
            this.y += Math.sin(angle) * force * 1.5
            this.size = this.baseSize * (1 + force * 1.5)
          } else {
            if (this.size > this.baseSize) {
              this.size -= 0.1
            }
          }
        }
      }

      draw() {
        if (!ctx) return
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
      }
    }

    const init = () => {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle())
      }
    }

    const animate = () => {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw links between close particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update()
        particles[i].draw()

        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 120) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
            const alpha = ((120 - dist) / 120) * (isDark ? 0.08 : 0.05)
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      init()
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    // Listen to theme change
    const observer = new MutationObserver(() => {
      particles.forEach((p) => p.updateColor())
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)

    init()
    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
      observer.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="canvas-bg" aria-hidden="true" />
}
