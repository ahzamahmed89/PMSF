import React, { useState } from 'react';
import axios from 'axios';

export default function TrainableAIChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hi! I am a trainable AI. Ask me anything from my training data.' }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(msgs => [...msgs, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post('/api/ai-trainable', { question: userMsg });
      setMessages(msgs => [...msgs, { sender: 'ai', text: res.data.answer }]);
    } catch (err) {
      setMessages(msgs => [...msgs, { sender: 'ai', text: 'AI backend error.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 350, background: '#fff', border: '1px solid #ccc', borderRadius: 8, boxShadow: '0 2px 8px #0002', zIndex: 1000 }}>
      <div style={{ padding: 12, borderBottom: '1px solid #eee', fontWeight: 'bold' }}>Trainable AI Chat</div>
      <div style={{ maxHeight: 250, overflowY: 'auto', padding: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 8, textAlign: msg.sender === 'ai' ? 'left' : 'right' }}>
            <span style={{ background: msg.sender === 'ai' ? '#f0f0f0' : '#d0f0ff', padding: 6, borderRadius: 6 }}>{msg.text}</span>
          </div>
        ))}
        {loading && <div style={{ color: '#888' }}>AI is typing...</div>}
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #eee', padding: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, marginRight: 8, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
          placeholder="Ask a question..."
        />
        <button onClick={handleSend} disabled={loading} style={{ padding: '6px 12px', borderRadius: 4, border: 'none', background: '#007bff', color: '#fff' }}>Send</button>
      </div>
    </div>
  );
}
