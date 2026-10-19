import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './giao-dien/nen-tang/token.css';
import './giao-dien/nen-tang/co-ban.css';
import { UngDung } from './ung-dung/UngDung.tsx';

createRoot(document.getElementById('goc')!).render(
  <StrictMode>
    <UngDung />
  </StrictMode>,
);
