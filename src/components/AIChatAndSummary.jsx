import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as tf from '@tensorflow/tfjs';
import { load } from '@tensorflow-models/mobilenet';
import LoadingSpinner from './LoadingSpinner';

export default function AIChatAndSummary() {
  // Q&A Chat state
  const [qaChatOpen, setQaChatOpen] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [qaMessages, setQaMessages] = useState([
    { sender: 'ai', text: 'Hi! Ask me anything from my training data.' }
  ]);
  const [qaLoading, setQaLoading] = useState(false);

  // Q&A Chat send handler
  const handleQaSend = async () => {
    if (!qaInput.trim()) return;
    const userMsg = qaInput.trim();
    setQaMessages(msgs => [...msgs, { sender: 'user', text: userMsg }]);
    setQaInput('');
    setQaLoading(true);
    try {
      const res = await axios.post('http://localhost:5001/api/ai-trainable', { question: userMsg });
      setQaMessages(msgs => [...msgs, { sender: 'ai', text: res.data.answer }]);
    } catch (err) {
      setQaMessages(msgs => [...msgs, { sender: 'ai', text: 'AI backend error.' }]);
    }
    setQaLoading(false);
  };

  // Floating AI summary state
  const [pageSummary, setPageSummary] = useState('');
  const [pageSummaryLoading, setPageSummaryLoading] = useState(false);

  // Floating AI summary button handler (rule-based)
  const summarizePage = () => {
    setPageSummaryLoading(true);
    setTimeout(() => {
      setPageSummary('No visit data loaded.'); // Placeholder, update as needed
      setPageSummaryLoading(false);
    }, 300);
  };

  // AI analysis state
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const aiImageRef = useRef(null);

  // Analyze image using MobileNet
  const analyzeImage = async (imagePath) => {
    setAiLoading(true);
    setAiSummary('');
    try {
      const model = await load();
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = `/images/${imagePath}`;
      img.onload = async () => {
        const predictions = await model.classify(img);
        if (predictions && predictions.length > 0) {
          setAiSummary(
            predictions
              .map(p => `${p.className} (${(p.probability * 100).toFixed(1)}%)`)
              .join(', ')
          );
        } else {
          setAiSummary('No clear prediction.');
        }
        setAiLoading(false);
      };
      img.onerror = () => {
        setAiSummary('Failed to load image for analysis.');
        setAiLoading(false);
      };
    } catch (err) {
      setAiSummary('AI analysis failed.');
      setAiLoading(false);
    }
  };

  return (
    <>
      {/* Floating Q&A Chat Button */}
      <button
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, background: '#007bff', color: '#fff', borderRadius: 8, padding: '12px 18px', border: 'none', boxShadow: '0 2px 8px #0002' }}
        onClick={() => setQaChatOpen(open => !open)}
      >
        {qaChatOpen ? 'Close AI Chat' : 'Open AI Chat'}
      </button>

      {/* Q&A Chat Window */}
      {qaChatOpen && (
        <div style={{ position: 'fixed', bottom: 70, right: 20, width: 350, background: '#fff', border: '1px solid #ccc', borderRadius: 8, boxShadow: '0 2px 8px #0002', zIndex: 1000 }}>
          <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Trainable AI Chat</div>
          <div style={{ maxHeight: 250, overflowY: 'auto', padding: 12 }}>
            {qaMessages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 8, textAlign: msg.sender === 'ai' ? 'left' : 'right' }}>
                <span style={{ background: msg.sender === 'ai' ? '#f0f0f0' : '#d0f0ff', padding: 6, borderRadius: 6 }}>{msg.text}</span>
              </div>
            ))}
            {qaLoading && <div style={{ color: '#888' }}>AI is typing...</div>}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #eee', padding: 8 }}>
            <input
              value={qaInput}
              onChange={e => setQaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQaSend()}
              style={{ flex: 1, marginRight: 8, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
              placeholder="Ask a question..."
            />
            <button onClick={handleQaSend} disabled={qaLoading} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#007bff', color: '#fff' }}>Send</button>
          </div>
        </div>
      )}
      {/* Image analysis UI can be added here as needed */}
    </>
  );
}
