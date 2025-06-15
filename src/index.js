import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// La importación de reportWebVitals ya no es necesaria, la reemplazamos.
// import reportWebVitals from './reportWebVitals';

// 1. Importamos el registrador del Service Worker.
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 2. Activamos el Service Worker para habilitar las funcionalidades PWA.
// Esto reemplaza la llamada a reportWebVitals().
serviceWorkerRegistration.register();
