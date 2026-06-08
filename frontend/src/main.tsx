import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { applyStoredLanguage } from './utils/appLanguage'
import { applyStoredTheme } from './utils/appTheme'
import './index.css' // 전역 스타일

applyStoredLanguage()
applyStoredTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
