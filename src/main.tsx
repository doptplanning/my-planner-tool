import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './components/Auth/AuthContext'
import { FormDataProvider } from './components/FormDataContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FormDataProvider>
        <App />
      </FormDataProvider>
    </AuthProvider>
  </StrictMode>,
)
