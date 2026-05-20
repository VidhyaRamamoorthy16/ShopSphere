import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Wake up Render services on page load
const SERVICES = [
  'https://shopsphere-a1sj.onrender.com/api/products',
  'https://shopsphere-gateway.onrender.com/health',
  'https://shopsphere-monitor.onrender.com/health',
];
SERVICES.forEach(url => {
  fetch(url, { method: 'GET' }).catch(() => {});
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
