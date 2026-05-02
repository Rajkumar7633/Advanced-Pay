'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, Loader2, Zap, CheckCircle2, XCircle, ShieldAlert, UserCheck, UserX, Scale, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { merchantsApi } from '@/lib/api';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: ActionPayload | null;
  actionResult?: 'success' | 'error' | 'pending' | null;
}

interface ActionPayload {
  type: string;
  label: string;
  params: Record<string, string>;
}

const ACTION_ICONS: Record<string, any> = {
  REFUND_TRANSACTION: Banknote,
  SUSPEND_MERCHANT: UserX,
  APPROVE_MERCHANT: UserCheck,
  RESOLVE_DISPUTE: Scale,
  APPROVE_SETTLEMENT: CheckCircle2,
};

const ACTION_COLORS: Record<string, string> = {
  REFUND_TRANSACTION: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  SUSPEND_MERCHANT: 'border-red-500/40 bg-red-500/10 text-red-300',
  APPROVE_MERCHANT: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  RESOLVE_DISPUTE: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  APPROVE_SETTLEMENT: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
};

const ACTION_BTN_COLORS: Record<string, string> = {
  REFUND_TRANSACTION: 'bg-amber-600 hover:bg-amber-700',
  SUSPEND_MERCHANT: 'bg-red-600 hover:bg-red-700',
  APPROVE_MERCHANT: 'bg-emerald-600 hover:bg-emerald-700',
  RESOLVE_DISPUTE: 'bg-blue-600 hover:bg-blue-700',
  APPROVE_SETTLEMENT: 'bg-indigo-600 hover:bg-indigo-700',
};

export function AiCopilot({ isAdmin = false }: { isAdmin?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
      { role: 'assistant', content: isAdmin
          ? 'SuperAdmin Core AI online. I have full platform access. I can analyze data, manage merchants, force refunds, and resolve disputes on your command.'
          : 'Initialization complete. I am connected to the Advanced Pay internal cluster. How can I assist you with your operations today?'
      }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [executingIdx, setExecutingIdx] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
                 // Safely normalize arrays regardless of backend response shape
                 const merchantsArr = Array.isArray(merchants.data) ? merchants.data : (merchants.data?.data || []);
                 const disputesArr  = Array.isArray(disputes.data)  ? disputes.data  : (disputes.data?.data  || []);
                 liveContext = { 
                     admin_system_metrics: metrics.data,
                     platform_merchants: merchantsArr,
                     // Split disputes so AI never confuses resolved vs open
                     open_disputes: disputesArr.filter((d: any) => d.status === 'open' || d.status === 'under_review'),
                     all_disputes: disputesArr
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

          const res = await fetch('/api/ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: userQuery, context: liveContext, isAdmin })
          });

          const data = await res.json();
          
          if (!res.ok) throw new Error(data.error || "System failure");

          setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: data.response,
              action: data.action || null,
              actionResult: data.action ? 'pending' : null
          }]);

      } catch (err: any) {
          setMessages(prev => [...prev, { role: 'assistant', content: `**CRITICAL ERROR:** ${err.message}` }]);
      } finally {
          setIsTyping(false);
      }
  };

  const handleExecuteAction = async (msgIdx: number, action: ActionPayload) => {
      setExecutingIdx(msgIdx);
      try {
          const adminToken = isAdmin ? (sessionStorage.getItem('admin_token') || '') : '';
          const res = await fetch('/api/ai/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ actionType: action.type, params: action.params, adminToken })
          });

          const result = await res.json();

          setMessages(prev => prev.map((m, i) => {
              if (i === msgIdx) {
                  return { ...m, actionResult: res.ok ? 'success' : 'error' };
              }
              return m;
          }));

          // Append outcome message
          const outcomeMsg = res.ok
              ? `✅ **Action executed successfully:** ${action.label}`
              : `❌ **Action failed:** ${result.error}`;
          setMessages(prev => [...prev, { role: 'assistant', content: outcomeMsg }]);

      } catch (err: any) {
          setMessages(prev => prev.map((m, i) => i === msgIdx ? { ...m, actionResult: 'error' } : m));
          setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Execution Error:** ${err.message}` }]);
      } finally {
          setExecutingIdx(null);
      }
  };

  const formatText = (text: string) => {
      const lines = text.split('\n');
      return lines.map((line, li) => {
          const parts = line.split(/(\*\*.*?\*\*)/g);
          return (
              <span key={li}>
                  {parts.map((part, i) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                      }
                      return <span key={i}>{part}</span>;
                  })}
                  {li < lines.length - 1 && <br />}
              </span>
          );
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
            "fixed bottom-6 right-6 z-50 w-[420px] h-[620px] max-h-[85vh] flex flex-col bg-[#0f1219] border border-indigo-500/30 rounded-2xl shadow-2xl transition-all duration-500 origin-bottom-right overflow-hidden",
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
                    <h3 className="text-sm font-bold text-white tracking-wide">
                        {isAdmin ? 'SuperAdmin Core AI' : 'Advanced Pay Copilot'}
                    </h3>
                    <p className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       {isAdmin ? 'God-Mode · Action-Capable' : 'Gemini Core Active'}
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
                     <div className="flex flex-col gap-2 max-w-[80%]">
                         <div className={cn(
                             "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                             m.role === 'user' ? "bg-slate-800 text-slate-200 rounded-tr-none" : "bg-indigo-950/30 border border-indigo-500/20 text-indigo-100 rounded-tl-none shadow-[inset_0_0_20px_rgba(79,70,229,0.05)]"
                         )}>
                             {m.role === 'assistant' ? formatText(m.content) : m.content}
                         </div>

                         {/* Action Confirmation Card */}
                         {m.action && m.actionResult === 'pending' && (() => {
                             const ActionIcon = ACTION_ICONS[m.action.type] || Zap;
                             const colorClass = ACTION_COLORS[m.action.type] || 'border-slate-500/40 bg-slate-500/10 text-slate-300';
                             const btnClass = ACTION_BTN_COLORS[m.action.type] || 'bg-indigo-600 hover:bg-indigo-700';
                             return (
                                 <div className={cn("rounded-xl border p-3 text-xs space-y-2", colorClass)}>
                                     <div className="flex items-center gap-2 font-bold">
                                         <Zap className="w-3.5 h-3.5" />
                                         AI Action Detected
                                     </div>
                                     <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2 py-1.5">
                                         <ActionIcon className="w-3.5 h-3.5 shrink-0" />
                                         <span className="font-mono font-bold">{m.action.label}</span>
                                     </div>
                                     <p className="text-[10px] opacity-70">Review and confirm before executing this action.</p>
                                     <div className="flex gap-2">
                                         <button
                                             disabled={executingIdx === idx}
                                             onClick={() => handleExecuteAction(idx, m.action!)}
                                             className={cn("flex-1 py-1.5 rounded-lg font-bold text-white text-[11px] transition-colors flex items-center justify-center gap-1.5", btnClass)}
                                         >
                                             {executingIdx === idx
                                                 ? <><Loader2 className="w-3 h-3 animate-spin" /> Executing...</>
                                                 : <><CheckCircle2 className="w-3 h-3" /> Confirm & Execute</>
                                             }
                                         </button>
                                         <button
                                             onClick={() => setMessages(prev => prev.map((msg, i) => i === idx ? { ...msg, actionResult: 'error' } : msg))}
                                             className="px-3 py-1.5 rounded-lg font-bold text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1"
                                         >
                                             <XCircle className="w-3 h-3" /> Cancel
                                         </button>
                                     </div>
                                 </div>
                             );
                         })()}

                         {/* Action Result Badge */}
                         {m.action && m.actionResult === 'success' && (
                             <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
                                 <CheckCircle2 className="w-3 h-3" /> Action executed
                             </div>
                         )}
                         {m.action && m.actionResult === 'error' && (
                             <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                 <XCircle className="w-3 h-3" /> Action cancelled
                             </div>
                         )}
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

          {/* Suggested Actions Bar (admin only) */}
          {isAdmin && (
              <div className="px-3 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-800/50">
                  {[
                      { label: '🔍 Show merchants', prompt: 'List all merchants and their status' },
                      { label: '⚠️ Open disputes', prompt: 'Show all open disputes' },
                      { label: '📊 Platform stats', prompt: 'Give me a summary of global platform metrics' },
                  ].map(s => (
                      <button
                          key={s.label}
                          onClick={() => setInput(s.prompt)}
                          className="shrink-0 text-[10px] px-2.5 py-1 rounded-full border border-slate-700 text-slate-400 hover:border-indigo-500/60 hover:text-indigo-300 transition-colors whitespace-nowrap"
                      >
                          {s.label}
                      </button>
                  ))}
              </div>
          )}

          {/* Input Area */}
          <div className="p-4 bg-[#0a0d14] border-t border-slate-800">
             <form onSubmit={handleSubmit} className="relative flex items-center">
                 <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isAdmin ? "Command the platform... e.g. 'Refund TX-abc123'" : "Ask Copilot about routing, fraud, or payments..."}
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
