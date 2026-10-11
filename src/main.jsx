import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { applyVariant } from './config/variant.js'
import './styles/globals.css'

applyVariant()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)