import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext.jsx'
import SesionGate from './components/SesionGate.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SesionGate>
      <AppProvider>
        <App />
      </AppProvider>
    </SesionGate>
  </React.StrictMode>
)