import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ShareView from './components/ShareView.jsx'

const shareMatch = window.location.pathname.match(/^\/share\/([^/]+)/);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {shareMatch ? <ShareView token={shareMatch[1]} /> : <App />}
  </StrictMode>,
)
