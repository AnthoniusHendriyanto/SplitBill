/* eslint-disable react-refresh/only-export-components -- Entry module mounts the root rather than exporting components. */
import { Suspense, lazy, useEffect } from 'react'
import { MotionConfig } from 'framer-motion'
import useBillStore from './store/useBillStore'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'))
const BillDetailPage = lazy(() => import('./pages/BillDetailPage.jsx'))

function Application() {
  const darkMode = useBillStore(s => s.settings.darkMode)
  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = darkMode ?? system.matches
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#151714' : '#f5f6f0')
    }
    apply()
    system.addEventListener('change', apply)
    return () => system.removeEventListener('change', apply)
  }, [darkMode])
  return (
  <MotionConfig reducedMotion="user">
  <BrowserRouter>
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen bg-page flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[--brand-primary] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/bill/:id" element={<BillDetailPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </BrowserRouter>
  </MotionConfig>
  )
}

createRoot(document.getElementById('root')).render(<Application />)
