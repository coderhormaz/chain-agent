import React from 'react';
import '../styles/components.css';

export const Extra: React.FC = () => {
  return (
    <section 
      id="stats" 
      className="contact-section" 
      style={{ 
        visibility: 'hidden',
        height: 0,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        position: 'absolute',
        pointerEvents: 'none'
      }}
    >
      <div className="container">
        <div className="contact-content">
          <div className="contact-header">
            <h2>Hidden</h2>
          </div>
          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-info-card"></div>
            </div>
            <div className="contact-form-container">
              <div className="contact-form"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
