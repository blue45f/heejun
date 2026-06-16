import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export const exportToPdf = async (elementId: string, filename: string = 'resume.pdf') => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`Element with id ${elementId} not found`)
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
  await new Promise((resolve) => setTimeout(resolve, 500))

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Retain sharp text quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    })

    console.log(`Canvas dimensions: ${canvas.width}x${canvas.height}`)

    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    // Create PDF in A4 size
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 295 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0
    let pageCount = 1

    console.log(
      `PDF calc - imgHeight: ${imgHeight}mm, pageHeight: ${pageHeight}mm, initial heightLeft: ${heightLeft}mm`,
    )

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    // Multi-page handling
    while (heightLeft > 0) {
      position = heightLeft - imgHeight // slide up
      pdf.addPage()
      pageCount++
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    console.log(`PDF generation completed. Total pages: ${pageCount}`)
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
