import React, { useState } from 'react';
import VoiceAgent from './Components/VoiceAgent';
import './styles/App.css';

function App() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Voice Agent Demo</h1>
        <p>Press the button below to talk to the AI voice agent</p>
      </header>
      <main className="App-main">
        <VoiceAgent
          onConnectionChange={(status) => setIsConnected(status)}
        />
        <div className="connection-status">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </main>
      <footer className="App-footer">
        <p>Powered by Deepgram Voice Agent API</p>
      </footer>
    </div>
  );
}

export default App;