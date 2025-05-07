import React, { useState, useEffect, useRef } from 'react';
import RecordButton from './RecordButton';
import TranscriptDisplay from './TranscriptDisplay';
import '../styles/VoiceAgent.css';

// WebSocket URL - adjust according to your deployment
const WS_URL = window.location.origin.replace(/^http/, 'ws') + '/ws';

function VoiceAgent({ onConnectionChange }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);

  const websocketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioSourceRef = useRef(null);
  const processorRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  // Setup WebSocket connection
  useEffect(() => {
    return () => {
      // Clean up WebSocket connection on component unmount
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // Function to initialize WebSocket connection
  const initializeWebsocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection established');
      setIsConnected(true);
      onConnectionChange(true);
      setError(null);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);
      setIsListening(false);
      onConnectionChange(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to server');
      setIsConnected(false);
      onConnectionChange(false);
    };

    ws.onmessage = handleWebSocketMessage;
  };

  // Handle messages from the server
  const handleWebSocketMessage = (event) => {
    // If the message is binary (audio data)
    if (event.data instanceof Blob) {
      handleAudioMessage(event.data);
    } else {
      // Parse JSON message
      try {
        const message = JSON.parse(event.data);
        handleJsonMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  };

  // Handle JSON messages from server
  const handleJsonMessage = (message) => {
    console.log('Received message:', message);

    switch (message.type) {
      case 'connected':
        console.log('Connected to server');
        break;

      case 'ready':
        console.log('Ready to start voice interaction');
        break;

      case 'error':
        console.error('Error from server:', message.message);
        setError(message.message);
        break;

      case 'agent-message':
        // Handle different types of agent messages
        if (message.data.type === 'ConversationText') {
          // Update transcript with new message
          setTranscript(prev => [
            ...prev,
            {
              role: message.data.role,
              text: message.data.content,
              timestamp: new Date().toISOString()
            }
          ]);
        }
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  };

  // Handle audio message from server
  const handleAudioMessage = async (audioBlob) => {
    try {
      // Add to audio queue
      const audioBuffer = await audioBlob.arrayBuffer();
      audioQueueRef.current.push(audioBuffer);
      
      // Start playing if not already playing
      if (!isPlayingRef.current) {
        playNextAudio();
      }
    } catch (error) {
      console.error('Error handling audio message:', error);
    }
  };

  // Play next audio in queue
  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift();

    try {
      // Initialize audio context if not available
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Decode the audio
      const decodedData = await audioContextRef.current.decodeAudioData(audioBuffer);
      
      // Create audio source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = decodedData;
      source.connect(audioContextRef.current.destination);
      
      // Play the audio
      source.onended = playNextAudio;
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      playNextAudio(); // Skip to next audio on error
    }
  };

  // Toggle recording on/off
  const toggleRecording = async () => {
    if (isListening) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Check if WebSocket is connected, if not initialize it
      if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
        initializeWebsocket();
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Initialize audio context if not available
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000 // Match Deepgram's expected sample rate
        });
      }

      // Create audio source from microphone
      audioSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create script processor for audio processing
      const bufferSize = 4096;
      processorRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize, 
        1, // mono input
        1  // mono output
      );

      // Process audio data
      processorRef.current.onaudioprocess = (e) => {
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
          // Get audio data from input channel
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert to 16-bit PCM
          const pcmData = convertFloat32ToInt16(inputData);
          
          // Send to server
          websocketRef.current.send(pcmData);
        }
      };

      // Connect nodes
      audioSourceRef.current.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      // Tell server to start voice agent connection
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: 'start' }));
      }

      setIsListening(true);
      setError(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to access microphone');
    }
  };

  // Stop recording
  const stopRecording = () => {
    // Disconnect and clean up audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }

    // Stop microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Tell server to stop voice agent connection
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'stop' }));
    }

    setIsListening(false);
  };

  // Utility function to convert Float32Array to Int16Array
  const convertFloat32ToInt16 = (buffer) => {
    const l = buffer.length;
    const buf = new Int16Array(l);

    for (let i = 0; i < l; i++) {
      // Convert to 16-bit signed integer
      const s = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    return buf.buffer;
  };

  return (
    <div className="voice-agent">
      <RecordButton 
        isRecording={isListening} 
        onToggle={toggleRecording}
        disabled={!isConnected && isListening}
      />

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <TranscriptDisplay transcript={transcript} />
    </div>
  );
}

export default VoiceAgent;