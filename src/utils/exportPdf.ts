import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export const exportToPdf = async (containerId: string, filename: string = 'resume.pdf') => {
  const container = document.getElementById(containerId)
  if (!container) {
    console.error(`Container with id ${containerId} not found`)
    return
  }

  // Find all individual pages inside the container
  const pages = container.querySelectorAll('.pdf-page')
  if (pages.length === 0) {
    console.error('No elements with class .pdf-page found inside container')
    return
  }

  // Save original scroll position
  const originalScrollY = window.scrollY
  // Scroll to top to ensure html2canvas starts capture from the beginning
  window.scrollTo(0, 0)

  // Save original theme
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'system'

  // Set to light theme for printing (high contrast, white background)
  document.documentElement.setAttribute('data-theme', 'light')

  // Add temporary print class to body to override layout constraints for clean capture
  document.body.classList.add('pdf-rendering')

  // Wait a bit for CSS transitions and styles to apply
  await new Promise((resolve) => setTimeout(resolve, 600))

  // Ensure every snapshot image inside the pages is fully decoded before capture,
  // otherwise html2canvas grabs them half-loaded and they render blank/broken in the PDF.
  const images = Array.from(container.querySelectorAll('img'))
  await Promise.all(
    images.map((img) => {
      // A failed image may already be `complete` with naturalWidth === 0. In that
      // state no later load/error event is emitted, so waiting for one blocks the
      // whole PDF export forever.
      if (img.complete) return Promise.resolve()

      return new Promise<void>((resolve) => {
        const finish = () => {
          window.clearTimeout(timeoutId)
          img.removeEventListener('load', finish)
          img.removeEventListener('error', finish)
          resolve()
        }
        const timeoutId = window.setTimeout(finish, 10_000)

        img.addEventListener('load', finish, { once: true })
        img.addEventListener('error', finish, { once: true })
      })
    }),
  )

  try {
    const pdf = new jsPDF('p', 'mm', 'a4')

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i] as HTMLElement
      const originalParent = pageEl.parentNode
      const originalNextSibling = pageEl.nextSibling
      const originalStyle = pageEl.getAttribute('style')

      // html2canvas can clip elements that sit several viewport-heights below the
      // current scroll position. Temporarily capture the real page at the viewport
      // origin so every A4 page uses the same stable coordinate system.
      Object.assign(pageEl.style, {
        position: 'fixed',
        top: '0',
        right: 'auto',
        bottom: 'auto',
        left: '0',
        margin: '0',
        transform: 'none',
        zIndex: '2147483647',
        pointerEvents: 'none',
      })
      document.body.appendChild(pageEl)

      console.log(`Capturing page ${i + 1}/${pages.length}...`)

      try {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

        const canvas = await html2canvas(pageEl, {
          scale: 2.5, // Extra sharp output
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: pageEl.offsetWidth,
          windowHeight: pageEl.offsetHeight,
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.98)

        if (i > 0) {
          pdf.addPage()
        }

        // Add image mapping exactly 1-to-1 with A4 paper size (210mm x 297mm)
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      } finally {
        if (originalStyle === null) {
          pageEl.removeAttribute('style')
        } else {
          pageEl.setAttribute('style', originalStyle)
        }

        if (originalParent) {
          originalParent.insertBefore(pageEl, originalNextSibling)
        }
      }
    }

    console.log(`PDF generation completed. Total pages: ${pages.length}`)
    pdf.save(filename)
  } catch (error) {
    console.error('PDF export failed:', error)
  } finally {
    // Restore original theme, scroll position and cleanup
    if (currentTheme === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', currentTheme)
    }
    document.body.classList.remove('pdf-rendering')
    window.scrollTo(0, originalScrollY)
  }
}
