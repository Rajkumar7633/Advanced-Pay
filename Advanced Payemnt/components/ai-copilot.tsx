'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, Loader2, Minimize2, Maximizar2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { merchantsApi } from '@/lib/api';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AiCopilot({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      { role: 'assistant', content: 'Initialization complete. I am connected to the Advanced Pay internal cluster. How can I assist you with your operations today?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isTyping) return;

      const userQuery = input;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
      setIsTyping(true);

      try {
          // Fetch dynamic context
          let liveContext = {};
          try {
             if (isAdmin) {
                 const token = sessionStorage.getItem('admin_token');
                 const headers = token ? { Authorization: `Bearer ${token}` } : {};
                 const [metrics, merchants, disputes] = await Promise.all([
                     axios.get('/api/v1/admin/metrics', { headers }).catch(() => ({ data: {} })),
                     axios.get('/api/v1/admin/merchants', { headers }).catch(() => ({ data: [] })),
                     axios.get('/api/v1/admin/disputes', { headers }).catch(() => ({ data: [] }))
                 ]);
                 liveContext = { 
                     admin_system_metrics: metrics.data,
                     platform_merchants: merchants.data,
                     open_disputes: disputes.data
                 };
             } else {
                 const [tData, dData, sData] = await Promise.all([
                     merchantsApi.getTransactions({ limit: 10, offset: 0 }).catch(() => ({ data: { data: [] } })),
                     merchantsApi.getDashboard().catch(() => ({ data: {} })),
                     merchantsApi.getStats().catch(() => ({ data: {} }))
                 ]);
                 liveContext = { 
                     recent_transactions: tData.data?.data || [],
                     dashboard_metrics: dData.data || {},
                     account_stats: sData.data || {}
                 };
             }
          } catch(e) {
             console.error("Context fetch failed, AI will operate without live context.", e);
          }

          // Send to Secure Server function
          const res = await fetch('/api/ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  prompt: userQuery,
                  context: liveContext,
                  isAdmin: isAdmin
              })
          });

          const data = await res.json();
          
          if (!res.ok) {
              throw new Error(data.error || "System failure");
          }

          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

      } catch (err: any) {
          setMessages(prev => [...prev, { role: 'assistant', content: `**CRITICAL ERROR:** ${err.message}` }]);
      } finally {
          setIsTyping(false);
      }
  };

  // Convert simple markdown roughly (Bold and basic lists)
  const formatText = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
         if (part.startsWith('**') && part.endsWith('**')) {
             return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
         }
         return <span key={i}>{part}</span>;
      });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button 
         onClick={() => setIsOpen(true)}
         className={cn(
             "fixed bottom-6 right-6 z-50 p-4 rounded-full bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-300 hover:scale-110 flex items-center justify-center",
             isOpen && "scale-0 opacity-0"
         )}
      >
         <Sparkles className="w-6 h-6" />
      </button>

      {/* Chat Window Panel */}
      <div 
         className={cn(
            "fixed bottom-6 right-6 z-50 w-[400px] h-[600px] max-h-[80vh] flex flex-col bg-[#0f1219] border border-indigo-500/30 rounded-2xl shadow-2xl transition-all duration-500 origin-bottom-right overflow-hidden",
            isOpen ? "scale-100 opacity-100" : "scale-50 opacity-0 pointer-events-none"
         )}
      >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900 to-[#0f1219] p-4 flex items-center justify-between border-b border-indigo-500/30">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.8)]">
                    <Bot className="w-5 h-5 text-white" />
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Advanced Pay Copilot</h3>
                    <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       Gemini Core Active
                    </p>
                 </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-1.5 rounded">
                 <X className="w-4 h-4" />
              </button>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
             {messages.map((m, idx) => (
                 <div key={idx} className={cn("flex gap-3", m.role === 'user' ? "flex-row-reverse" : "")}>
                     <div className={cn(
                         "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center",
                         m.role === 'user' ? "bg-slate-800" : "bg-indigo-900/50 border border-indigo-500/30"
                     )}>
                         {m.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : <Bot className="w-4 h-4 text-indigo-400" />}
                     </div>
                     <div className={cn(
                         "px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap",
                         m.role === 'user' ? "bg-slate-800 text-slate-200 rounded-tr-none" : "bg-indigo-950/30 border border-indigo-500/20 text-indigo-100 rounded-tl-none shadow-[inset_0_0_20px_rgba(79,70,229,0.05)]"
                     )}>
                         {m.role === 'assistant' ? formatText(m.content) : m.content}
                     </div>
                 </div>
             ))}
             {isTyping && (
                 <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-indigo-900/50 border border-indigo-500/30">
                         <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
                     </div>
                     <div className="px-4 py-3 rounded-2xl max-w-[80%] bg-indigo-950/30 border border-indigo-500/20 text-indigo-400 rounded-tl-none flex items-center gap-2">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span className="text-xs font-mono tracking-widest uppercase">Processing Telemetry...</span>
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-[#0a0d14] border-t border-slate-800">
             <form onSubmit={handleSubmit} className="relative flex items-center">
                 <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Copilot about routing, fraud, or code..."
                    className="w-full bg-[#111622] border border-slate-700 text-sm text-slate-200 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                 />
                 <button 
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    className="absolute right-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors"
                 >
                    <Send className="w-4 h-4" />
                 </button>
             </form>
          </div>
      </div>
    </>
  );
}
