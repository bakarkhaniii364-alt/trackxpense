import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Plus, 
  Check, 
  ChevronDown, 
  Trash2, 
  Paperclip,
  MessageSquare,
  Wallet,
  Tag,
  GitMerge,
  AlertCircle
} from 'lucide-react';
import { AppData, TransactionType, CategoryItem, Wallet as WalletType, WalletType as WType } from '../../types';
import { 
  RabbAiConversation, 
  RabbAiMessage, 
  RabbAiAction,
  loadRabbAiConversations, 
  saveRabbAiConversations, 
  sendRabbAiTextMessage, 
  sendRabbAiImageMessage 
} from '../../services/rabbAiService';

interface RabbAiChatWidgetProps {
  data: AppData;
  onAddTransaction: (t: any) => void;
  onAddWallet: (name: string, type: WType, target: number, currency?: string) => void;
  onDeleteWallet: (id: string) => void;
  onAddCategory: (cat: Omit<CategoryItem, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onMergeCategory: (fromId: string, intoId: string) => void;
}

export const RabbAiChatWidget: React.FC<RabbAiChatWidgetProps> = ({
  data,
  onAddTransaction,
  onAddWallet,
  onDeleteWallet,
  onAddCategory,
  onDeleteCategory,
  onMergeCategory
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<RabbAiConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isThreadDropdownOpen, setIsThreadDropdownOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadRabbAiConversations();
    setConversations(loaded);
    if (loaded.length > 0) setActiveConvId(loaded[0].id);
  }, []);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, activeConv?.messages.length, isLoading]);

  const updateConversations = (updated: RabbAiConversation[]) => {
    setConversations(updated);
    saveRabbAiConversations(updated);
  };

  const handleCreateNewThread = () => {
    const newThread: RabbAiConversation = {
      id: `conv_${Date.now()}`,
      title: `Chat ${conversations.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [{
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: 'Hello! I\'m RabbAi. I can help track expenses, manage wallets, and organize categories. What can I do for you?',
        timestamp: new Date().toISOString()
      }]
    };
    const updated = [newThread, ...conversations];
    updateConversations(updated);
    setActiveConvId(newThread.id);
    setIsThreadDropdownOpen(false);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) return;
    const updated = conversations.filter(c => c.id !== id);
    updateConversations(updated);
    if (activeConvId === id) setActiveConvId(updated[0].id);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) setSelectedImage(evt.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const patchMessage = (msgId: string, patch: Partial<RabbAiMessage>) => {
    if (!activeConv) return;
    const updated = conversations.map(c => {
      if (c.id !== activeConv.id) return c;
      return { ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, ...patch } : m) };
    });
    updateConversations(updated);
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
    const updatedConv = { ...activeConv, updatedAt: new Date().toISOString(), messages: updatedMessages };
    const updatedAllConvs = conversations.map(c => c.id === activeConv.id ? updatedConv : c);
    updateConversations(updatedAllConvs);

    let aiMsg: RabbAiMessage;
    if (userImg) {
      aiMsg = await sendRabbAiImageMessage(userImg, userText, data);
    } else {
      aiMsg = await sendRabbAiTextMessage(userText, updatedMessages, data);
    }

    const finalMessages = [...updatedMessages, aiMsg];
    const finalConv = {
      ...updatedConv,
      title: updatedConv.messages.length <= 2 ? (userText.slice(0, 24) || 'Receipt Scan') : updatedConv.title,
      updatedAt: new Date().toISOString(),
      messages: finalMessages
    };
    const finalAllConvs = updatedAllConvs.map(c => c.id === activeConv.id ? finalConv : c);
    updateConversations(finalAllConvs);
    setIsLoading(false);
  };

  // ── Action Handlers ──────────────────────────────────────────────────────
  const handleLogExtracted = (msgId: string, ext: NonNullable<RabbAiMessage['extractedTransaction']>) => {
    const wallet = data.wallets.find(w => w.id === data.currentWalletId);
    onAddTransaction({
      id: Date.now().toString(),
      amount: ext.amount,
      type: ext.type,
      category: ext.category,
      date: new Date().toISOString(),
      note: ext.description,
      walletId: data.currentWalletId
    });
    patchMessage(msgId, { extractedTransaction: { ...ext, isLogged: true } });
  };

  const handleExecuteAction = (msgId: string, action: RabbAiAction) => {
    if (action.type === 'ADD_WALLET') {
      onAddWallet(action.payload.name, 'STANDARD', 0, action.payload.currency);
    } else if (action.type === 'DELETE_WALLET') {
      const wallet = data.wallets.find(w => w.name.toLowerCase() === action.payload.name.toLowerCase());
      if (wallet) onDeleteWallet(wallet.id);
    } else if (action.type === 'ADD_CATEGORY') {
      const catType = action.payload.categoryType === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
      onAddCategory({ name: action.payload.name, type: catType });
    } else if (action.type === 'DELETE_CATEGORY') {
      const cat = data.categories.find(c => c.name.toLowerCase() === action.payload.name.toLowerCase());
      if (cat) onDeleteCategory(cat.id);
    } else if (action.type === 'MERGE_CATEGORY') {
      const fromCat = data.categories.find(c => c.name.toLowerCase() === action.payload.from.toLowerCase());
      const intoCat = data.categories.find(c => c.name.toLowerCase() === action.payload.into.toLowerCase());
      if (fromCat && intoCat) onMergeCategory(fromCat.id, intoCat.id);
    }
    patchMessage(msgId, { aiAction: { ...action, executed: true } });
  };

  // ── Render Action Card ───────────────────────────────────────────────────
  const renderActionCard = (msg: RabbAiMessage) => {
    const action = msg.aiAction;
    if (!action) return null;

    if (action.executed) {
      return (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--status-success-fg)] bg-[var(--status-success-bg)] px-2.5 py-1.5 rounded-[6px] mt-2">
          <Check size={13} /> Done
        </div>
      );
    }

    let icon = <Wallet size={14} />;
    let label = '';
    let description = '';
    let isDestructive = false;

    if (action.type === 'ADD_WALLET') {
      icon = <Wallet size={14} />;
      label = 'Create Wallet';
      description = `"${action.payload.name}" (${action.payload.currency})`;
    } else if (action.type === 'DELETE_WALLET') {
      icon = <Trash2 size={14} />;
      label = 'Delete Wallet';
      description = `"${action.payload.name}"`;
      isDestructive = true;
    } else if (action.type === 'ADD_CATEGORY') {
      icon = <Tag size={14} />;
      label = 'Add Category';
      description = `"${action.payload.name}" · ${action.payload.categoryType}`;
    } else if (action.type === 'DELETE_CATEGORY') {
      icon = <Trash2 size={14} />;
      label = 'Delete Category';
      description = `"${action.payload.name}"`;
      isDestructive = true;
    } else if (action.type === 'MERGE_CATEGORY') {
      icon = <GitMerge size={14} />;
      label = 'Merge Category';
      description = `"${action.payload.from}" → "${action.payload.into}"`;
      isDestructive = true;
    }

    return (
      <div className="pt-2 border-t border-[var(--border-default)]/60 space-y-2 mt-2">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-2.5 rounded-[8px] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
            {icon}
            <span className="font-semibold uppercase tracking-wide">{label}</span>
          </div>
          <div className="text-[13px] font-medium text-[var(--text-primary)]">{description}</div>
        </div>
        <button
          onClick={() => handleExecuteAction(msg.id, action)}
          className={`w-full py-1.5 px-3 font-semibold text-[12px] rounded-[6px] flex items-center justify-center gap-1.5 transition-all ${
            isDestructive
              ? 'bg-[var(--status-error-fg)] hover:opacity-80 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-black'
          }`}
        >
          <Check size={13} /> Confirm {label}
        </button>
      </div>
    );
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[9000] h-[52px] px-4 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] shadow-2xl hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] transition-all flex items-center gap-2.5 group"
          title="Open RabbAi Assistant"
        >
          <div className="relative flex items-center justify-center">
            <img src="/rabAi icon.png" alt="RabbAi" className="w-6 h-6 object-contain group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-surface)]" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight">RabbAi</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[9000] w-[380px] sm:w-[420px] h-[580px] max-h-[85vh] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)] animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="h-[52px] px-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <img src="/rabAi icon.png" alt="RabbAi" className="w-5 h-5 object-contain" />
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">RabbAi Assistant</span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Groq Vision · Llama 3.1
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
                  className="h-[28px] px-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-all"
                >
                  <MessageSquare size={12} strokeWidth={1.5} />
                  <span className="max-w-[70px] truncate">{activeConv?.title || 'History'}</span>
                  <ChevronDown size={12} />
                </button>

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

              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar text-[13px]">
            {activeConv?.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] px-1">
                    <span>{isUser ? 'You' : 'RabbAi'}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className={`max-w-[85%] rounded-[10px] p-3 text-[13px] leading-relaxed border ${
                    isUser
                      ? 'bg-[#2563eb] text-white border-blue-600 rounded-tr-none'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-default)] rounded-tl-none'
                  }`}>
                    {msg.imageUrl && (
                      <div className="rounded-[6px] overflow-hidden border border-white/20 max-h-[160px] mb-2">
                        <img src={msg.imageUrl} alt="Receipt Scan" className="w-full object-cover" />
                      </div>
                    )}

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Transaction log card */}
                    {msg.extractedTransaction && (
                      <div className="pt-2 border-t border-[var(--border-default)]/60 space-y-2 mt-2">
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
                            <Check size={13} /> Transaction Logged
                          </div>
                        ) : (
                          <button
                            onClick={() => handleLogExtracted(msg.id, msg.extractedTransaction!)}
                            className="w-full py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-[12px] rounded-[6px] flex items-center justify-center gap-1.5 transition-all"
                          >
                            <img src="/rabAi icon.png" alt="" className="w-3.5 h-3.5 object-contain" />
                            Log {data.settings.currencySymbol || '$'}{msg.extractedTransaction.amount} to Wallet
                          </button>
                        )}
                      </div>
                    )}

                    {/* AI action card (wallet/category actions) */}
                    {msg.aiAction && renderActionCard(msg)}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-[12px] text-[var(--text-muted)] p-2">
                <img src="/rabAi icon.png" alt="RabbAi" className="w-4 h-4 object-contain animate-bounce" />
                <span>RabbAi is thinking...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Image preview */}
          {selectedImage && (
            <div className="px-4 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <img src={selectedImage} alt="Preview" className="w-8 h-8 rounded object-cover border border-[var(--border-default)] shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)] truncate">Receipt ready for OCR scan</span>
              </div>
              <button onClick={() => setSelectedImage(null)} className="p-1 text-[var(--text-muted)] hover:text-rose-400">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input bar */}
          <div className="p-3 bg-[var(--bg-surface)] border-t border-[var(--border-default)] flex items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all shrink-0"
              title="Attach receipt for OCR"
            >
              <Paperclip size={16} strokeWidth={1.5} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

            <input
              type="text"
              placeholder="Ask RabbAi or say 'Spent $45 on food'..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              className="flex-1 h-[36px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />

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
