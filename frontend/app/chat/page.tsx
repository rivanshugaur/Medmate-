"use client";
import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Send, Bot, User, Activity, AlertTriangle } from 'lucide-react';

function ChatInterface() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patient_id');
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'bot', content: 'Hello! I am your AI triage assistant. I have reviewed your medical history. Can you tell me what symptoms you are experiencing today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !patientId) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8001/chat', {
        patient_id: parseInt(patientId),
        message: userMsg,
        history: messages.slice(1) // exclude the first greeting message to save context
      });
      
      setMessages(prev => [...prev, { role: 'bot', content: res.data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I encountered an error communicating with the server.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm py-4 px-6 flex justify-between items-center border-b">
        <div className="flex items-center">
          <Activity className="text-blue-600 mr-2" />
          <h1 className="text-xl font-bold text-gray-800">MedMate Triage Assistant</h1>
        </div>
        <div className="flex items-center text-sm text-gray-500 bg-gray-100 py-1 px-3 rounded-full">
          Patient ID: {patientId}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-start max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 ml-3' : 'bg-green-100 mr-3'}`}>
                {msg.role === 'user' ? <User className="text-blue-600" size={20}/> : <Bot className="text-green-600" size={20}/>}
              </div>
              <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none shadow-sm border border-gray-200'}`}>
                <p className="whitespace-pre-wrap" style={{ wordBreak: 'break-word' }}>
                  {msg.content.split(/(https?:\/\/[^\s)]+)/g).map((part, i) => 
                    part.match(/(https?:\/\/[^\s)]+)/) ? (
                      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline font-semibold">
                        Click here to add to Google Calendar
                      </a>
                    ) : (
                      part
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-gray-200 text-gray-500 p-3 rounded-2xl rounded-tl-none animate-pulse flex space-x-2">
               <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 border-t">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your symptoms..."
            disabled={loading}
            className="flex-1 border border-gray-300 rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center">
          <AlertTriangle size={12} className="mr-1" /> This AI is for triage and demonstration only. In a real emergency, call 911.
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading Triage Protocol...</div>}>
      <ChatInterface />
    </Suspense>
  );
}
