import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ParticleBackground } from './components/ParticleBackground'
import { Home } from './pages/Home'
import { Experience } from './pages/Experience'
import { Projects } from './pages/Projects'
import { Guides } from './pages/Guides'

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
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
