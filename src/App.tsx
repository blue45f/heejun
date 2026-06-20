import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ParticleBackground } from './components/ParticleBackground'
import { Home } from './pages/Home'
import { Experience } from './pages/Experience'
import { Projects } from './pages/Projects'
import { Guides } from './pages/Guides'
import { Sitemap } from './pages/Sitemap'
import { Design } from './pages/Design'

function App() {
  return (
    <Router>
      <ParticleBackground />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/design" element={<Design />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
