import React from 'react';
import { createRoot } from 'react-dom/client';
import './lib/iframeBridge.js';
import Root from './Root.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
