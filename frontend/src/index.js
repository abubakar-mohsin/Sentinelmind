import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// No StrictMode — prevents double WebSocket connections in development
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
