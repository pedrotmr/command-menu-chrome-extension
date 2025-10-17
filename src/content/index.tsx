import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from './Modal';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import '@/styles/global.css';

console.log('Command Palette: Content script loaded');

// Prevent multiple injections
if (!(window as any).commandPaletteInjected) {
  (window as any).commandPaletteInjected = true;

  // Create root element for React app
  const rootElement = document.createElement('div');
  rootElement.id = 'command-palette-root';
  document.body.appendChild(rootElement);

  function App() {
    const [isOpen, setIsOpen] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    // Listen for messages from background script
    useEffect(() => {
      const handleMessage = (
        message: any,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response?: any) => void
      ) => {
        if (message.action === 'toggle-modal') {
          setIsOpen((prev) => !prev);
          sendResponse({ success: true });
        } else if (message.action === 'copy-url') {
          const url = window.location.href;
          navigator.clipboard
            .writeText(url)
            .then(() => {
              showToast('URL copied to clipboard');
            })
            .catch((err) => {
              console.error('Failed to copy URL:', err);
              showToast('Failed to copy URL', true);
            });
          sendResponse({ success: true });
        }
        return true; // Keep the message channel open for async response
      };

      chrome.runtime.onMessage.addListener(handleMessage);
      return () => chrome.runtime.onMessage.removeListener(handleMessage);
    }, [showToast]);

    return (
      <>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  // Render the app
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
