import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { preWarmServers } from './utils/preWarmServers.js'

// Fire server pre-warm IMMEDIATELY — before React renders anything
preWarmServers()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
