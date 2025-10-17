import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import '@/styles/global.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <Popup />
    </StrictMode>
  );
}
