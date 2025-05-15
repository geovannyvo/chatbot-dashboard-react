// src/App.js
import React from 'react';
import ChatbotInteractions from './ChatbotInteractions';
import './App.css'; // Puedes crear este archivo para estilos

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Dashboard del Chatbot</h1>
      </header>
      <main>
        <ChatbotInteractions />
      </main>
    </div>
  );
}

export default App;