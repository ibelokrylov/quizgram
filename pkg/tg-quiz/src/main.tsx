// import { backButton, init } from '@telegram-apps/sdk-react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// init();
// backButton.mount();
createRoot(document.getElementById('root')!).render(<App />);
