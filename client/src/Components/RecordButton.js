import React from 'react';
import '../styles/RecordButton.css';

function RecordButton({ isRecording, onToggle, disabled }) {
  return (
    <div className="record-button-container">
      <button 
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={onToggle}
        disabled={disabled}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <div className="button-icon">
          {isRecording ? (
            <span className="stop-icon"></span>
          ) : (
            <span className="mic-icon"></span>
          )}
        </div>
        <span className="button-text">
          {isRecording ? 'Stop' : 'Talk to Agent'}
        </span>
      </button>
      {isRecording && (
        <div className="pulse-animation"></div>
      )}
      <p className="button-hint">
        {isRecording 
          ? 'Agent is listening. Click to stop.'
          : 'Click to start talking to the agent'}
      </p>
    </div>
  );
}

export default RecordButton;