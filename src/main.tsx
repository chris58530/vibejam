import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { I18nProvider } from './lib/i18n';
import './index.css';

// Disable browser scroll restoration as early as possible, before any React
// render. Setting this inside a React effect is too late — Chrome may have
// already applied restoration by the time useLayoutEffect runs.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);

