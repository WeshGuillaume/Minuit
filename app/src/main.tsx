import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app.tsx'
import { doctor } from './adapters/doctor'

if (import.meta.env.DEV) {
  // Run `await ccgaugeDoctor()` in the devtools console to inspect Axis 2.
  // Not auto-run: the usage endpoint 429-throttles aggressively, so we only
  // probe on demand rather than on every reload.
  ;(window as unknown as { ccgaugeDoctor: typeof doctor }).ccgaugeDoctor = doctor
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
