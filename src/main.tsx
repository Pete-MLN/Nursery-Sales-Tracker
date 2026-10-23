import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely handle Firestore offline notices so they don't get reported as fatal runtime exceptions
const origError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  if (
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('operate in offline mode') ||
    (msg.includes('@firebase/firestore') && msg.includes('offline'))
  ) {
    console.warn(...args);
    return;
  }
  origError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

