import '@agiviet/giao-dien/token.css';
import '@agiviet/giao-dien/co-ban.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { UngDung } from './ung-dung.tsx';

createRoot(document.getElementById('goc')!).render(
  <StrictMode>
    <UngDung />
  </StrictMode>,
);
