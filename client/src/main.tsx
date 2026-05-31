import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { PrefsProvider } from './context/PrefsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrefsProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </PrefsProvider>
  </StrictMode>,
)
