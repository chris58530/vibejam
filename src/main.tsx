import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// 關閉瀏覽器原生 scroll 記憶，讓 ScrollToTop 完全接管
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
import App from './App.tsx';
import { I18nProvider } from './lib/i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);

