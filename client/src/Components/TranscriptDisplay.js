import React, { useEffect, useRef } from 'react';
import '../styles/TranscriptDisplay.css';

function TranscriptDisplay({ transcript }) {
  const transcriptRef = useRef(null);

  // Auto-scroll to bottom when transcript updates
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div className="transcript-container">
      <h2>Conversation</h2>
      <div className="transcript" ref={transcriptRef}>
        {transcript.length === 0 ? (
          <div className="empty-transcript">
            <p>Your conversation will appear here</p>
          </div>
        ) : (
          transcript.map((message, index) => (
            <div 
              key={index} 
              className={`message ${message.role === 'user' ? 'user-message' : 'agent-message'}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? 'You' : 'Agent'}
                </span>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">
                {message.text}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TranscriptDisplay;
