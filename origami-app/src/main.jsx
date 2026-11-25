import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { player } from './store.js';

if (import.meta.env.DEV || location.search.includes('debug')) window.__player = player;

createRoot(document.getElementById('root')).render(<App />);
