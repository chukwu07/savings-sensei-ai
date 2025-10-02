import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import emailjs from '@emailjs/browser';

// Initialize EmailJS with public key
emailjs.init('oEFATUkrPGUAdS4Ut');

createRoot(document.getElementById("root")!).render(<App />);
