import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Image as ImageIcon, 
  Plus, 
  Sparkles, 
  Zap, 
  Check, 
  ChevronDown, 
  Trash2, 
  Paperclip,
  MessageSquare
} from 'lucide-react';
import { AppData, TransactionType } from '../../types';
import { 
  RabbAiConversation, 
  RabbAiMessage, 
  loadRabbAiConversations, 
  saveRabbAiConversations, 
  sendRabbAiTextMessage, 
  sendRabbAiImageMessage 
} from '../../services/rabbAiService';

interface RabbAiChatWidgetProps {
  data: AppData;
  onAddTransaction: (type: TransactionType, details: { amount: number; category: string; note?: string }) => void;
}

export const RabbAiChatWidget: React.FC<RabbAiChatWidgetProps> = ({ data, onAddTransaction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<RabbAiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize conversation threads
  useEffect(() => {
    const loaded = loadRabbAiConversations();
    setConversations(loaded);
    if (loaded.length > 0) {
      setActiveConvId(loaded[0].id);
    }
  }, []);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, activeConv?.messages.length, isLoading]);

  const handleCreateNewThread = () => {
    const newThread: RabbAiConversation = {
      id: `conv_${Date.now()}`,
      title: `Chat ${conversations.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: 'Hello! I am RabbAi. How can I assist with your budget or receipt scans today?',
          timestamp: new Date().toISOString()
        }
      ]
    };
    const updated = [newThread, ...conversations];
    setConversations(updated);
    setActiveConvId(newThread.id);
    saveRabbAiConversations(updated);
    setIsThreadDropdownOpen(false);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) return;
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    saveRabbAiConversations(updated);
    if (activeConvId === id) {
      setActiveConvId(updated[0].id);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setSelectedImage(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage) || isLoading || !activeConv) return;

    const userText = inputText.trim();
    const userImg = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    const userMsg: RabbAiMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userText || (userImg ? 'Uploaded Receipt Photo' : ''),
      imageUrl: userImg || undefined,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...activeConv.messages, userMsg];
    const updatedConv: RabbAiConversation = {
      ...activeConv,
      updatedAt: new Date().toISOString(),
      messages: updatedMessages
    };

    const updatedAllConvs = conversations.map(c => c.id === activeConv.id ? updatedConv : c);
    setConversations(updatedAllConvs);
    saveRabbAiConversations(updatedAllConvs);

    // Call RabbAi API
    let aiMsg: RabbAiMessage;
    if (userImg) {
      aiMsg = await sendRabbAiImageMessage(userImg, userText, data);
    } else {
      aiMsg = await sendRabbAiTextMessage(userText, updatedMessages, data);
    }

    const finalMessages = [...updatedMessages, aiMsg];
    const finalConv: RabbAiConversation = {
      ...updatedConv,
      title: updatedConv.messages.length <= 2 ? (userText.slice(0, 20) || 'Receipt Scan') : updatedConv.title,
      updatedAt: new Date().toISOString(),
      messages: finalMessages
    };

    const finalAllConvs = conversations.map(c => c.id === activeConv.id ? finalConv : c);
    setConversations(finalAllConvs);
    saveRabbAiConversations(finalAllConvs);
    setIsLoading(false);
  };

  const handleLogExtracted = (msgId: string, ext: NonNullable<RabbAiMessage['extractedTransaction']>) => {
    onAddTransaction(ext.type, {
      amount: ext.amount,
      category: ext.category,
      note: ext.description
    });

    if (!activeConv) return;
    const updatedMessages = activeConv.messages.map(m => {
      if (m.id === msgId && m.extractedTransaction) {
        return {
          ...m,
          extractedTransaction: {
            ...m.extractedTransaction,
            isLogged: true
          }
        };
      }
      return m;
    });

    const updatedConv = { ...activeConv, messages: updatedMessages };
    const updatedAll = conversations.map(c => c.id === activeConv.id ? updatedConv : c);
    setConversations(updatedAll);
    saveRabbAiConversations(updatedAll);
  };

  return (
    <>
      {/* Floating Trigger Button at Bottom Right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9000] h-[52px] px-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-2xl hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] transition-all flex items-center gap-2.5 group"
          title="Open RabbAi Assistant"
        >
          <div className="relative flex items-center justify-center">
            <Zap size={20} className="text-amber-400 stroke-[1.5px] group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">RabbAi</span>
        </button>
      )}

      {/* Expanded Chat Console Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9000] w-[380px] sm:w-[420px] h-[580px] max-h-[85vh] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header Bar */}
          <div className="h-[52px] px-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50 flex items-center justify-between shrink-0 relative">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-400 stroke-[1.5px]" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">RabbAi Assistant</span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Groq Vision & Llama 3.1
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Thread History Switcher Button */}
              <div className="relative">
                <button
                  onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
                  className="h-[28px] px-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-all"
                  title="Select Past Conversation"
                >
                  <MessageSquare size={12} strokeWidth={1.5} />
                  <span className="max-w-[70px] truncate">{activeConv?.title || 'History'}</span>
                  <ChevronDown size={12} />
                </button>

                {/* Dropdown Menu for Threads */}
                {isThreadDropdownOpen && (
                  <div className="absolute right-0 top-8 w-[220px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-xl p-1.5 z-50 space-y-1">
                    <button
                      onClick={handleCreateNewThread}
                      className="w-full h-[32px] px-2.5 rounded-[6px] bg-[#2563eb]/10 border border-[#2563eb]/20 text-[#2563eb] text-[12px] font-medium flex items-center justify-between hover:bg-[#2563eb]/20 transition-all"
                    >
                      <span className="flex items-center gap-1.5"><Plus size={13} /> New Chat</span>
                    </button>
                    
                    <div className="max-h-[180px] overflow-y-auto space-y-0.5 pt-1 border-t border-[var(--border-default)]">
                      {conversations.map(c => (
                        <div
                          key={c.id}
                          onClick={() => { setActiveConvId(c.id); setIsThreadDropdownOpen(false); }}
                          className={`w-full h-[32px] px-2 rounded-[6px] text-[12px] flex items-center justify-between cursor-pointer transition-colors ${
                            c.id === activeConv?.id 
                              ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-medium' 
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <span className="truncate flex-1">{c.title}</span>
                          {conversations.length > 1 && (
                            <button
                              onClick={(e) => handleDeleteThread(c.id, e)}
                              className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                              title="Delete chat"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Close/Minimize Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Chat Stream Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar text-[13px]">
            {activeConv?.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] px-1">
                    <span>{isUser ? 'You' : 'RabbAi'}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-[10px] p-3 text-[13px] leading-relaxed space-y-2 border ${
                      isUser
                        ? 'bg-[#2563eb] text-white border-blue-600 rounded-tr-none'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-default)] rounded-tl-none'
                    }`}
                  >
                    {/* User Uploaded Image Preview */}
                    {msg.imageUrl && (
                      <div className="rounded-[6px] overflow-hidden border border-white/20 max-h-[160px]">
                        <img src={msg.imageUrl} alt="Receipt Scan" className="w-full object-cover" />
                      </div>
                    )}

                    {/* Text Message Content */}
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Interactive OCR / Transaction Extraction Card */}
                    {msg.extractedTransaction && (
                      <div className="pt-2 border-t border-[var(--border-default)]/60 space-y-2">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-2.5 rounded-[8px] space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                            <span>EXTRACTED LOG</span>
                            <span className="text-amber-400 font-semibold">{msg.extractedTransaction.type}</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-[14px] text-[var(--text-primary)]">
                            <span>{msg.extractedTransaction.description}</span>
                            <span>{data.settings.currencySymbol || '$'}{msg.extractedTransaction.amount}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                            Category: {msg.extractedTransaction.category}
                          </div>
                        </div>

                        {msg.extractedTransaction.isLogged ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--status-success-fg)] bg-[var(--status-success-bg)] px-2.5 py-1.5 rounded-[6px]">
                            <Check size={13} /> Transaction Logged to Wallet
                          </div>
                        ) : (
                          <button
                            onClick={() => handleLogExtracted(msg.id, msg.extractedTransaction!)}
                            className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-[12px] rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          >
                            <Zap size={13} />
                            <span>Log {data.settings.currencySymbol || '$'}{msg.extractedTransaction.amount} to Wallet</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] p-2">
                <Zap size={14} className="animate-spin text-amber-400" />
                <span>RabbAi is analyzing input & scanning OCR...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Selected Image Thumbnail Preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <img src={selectedImage} alt="Preview" className="w-8 h-8 rounded object-cover border border-[var(--border-default)] shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)] truncate">Receipt photo ready for Groq OCR</span>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 text-[var(--text-muted)] hover:text-rose-400"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Footer Input Bar */}
          <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center gap-2 shrink-0">
            {/* Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all shrink-0"
              title="Attach photo/receipt for OCR scan"
            >
              <Paperclip size={16} strokeWidth={1.5} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Text Input */}
            <input
              type="text"
              placeholder="Ask RabbAi or type 'Spent $45'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="flex-1 h-[36px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] font-normal"
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
              className="h-[36px] px-3 bg-[#2563eb] hover:bg-blue-600 disabled:opacity-40 text-white rounded-[6px] font-medium text-[12px] flex items-center gap-1 transition-all shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
