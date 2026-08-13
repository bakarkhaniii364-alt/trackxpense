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
  AlertCircle,
  Download
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
import { wipeAllSiteData } from '../../services/storage';
import { MarkdownRenderer } from './MarkdownRenderer';

// ── CSV Generator ─────────────────────────────────────────────────────────────
function generateTransactionsCsv(transactions: any[], wallets: any[], currencySymbol: string): string {
  const headers = ['Date', 'Type', 'Amount', `Currency (${currencySymbol})`, 'Category', 'Description', 'Wallet'];
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(t => {
      const wallet = wallets.find((w: any) => w.id === t.walletId);
      return [
        escape(new Date(t.date).toLocaleDateString('en-CA')), // YYYY-MM-DD
        escape(t.type),
        t.amount.toFixed(2),
        escape(currencySymbol),
        escape(t.category || ''),
        escape(t.note || ''),
        escape(wallet?.name || 'Unknown')
      ].join(',');
    });
  return [headers.join(','), ...rows].join('\n');
}

interface RabbAiChatWidgetProps {
  data: AppData;
  onAddTransaction: (t: any) => void;
  onDeleteTransaction: (id: string) => void;
  onAddWallet: (name: string, type: WType, target: number, currency?: string) => void;
  onDeleteWallet: (id: string) => void;
  onAddCategory: (cat: Omit<CategoryItem, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onMergeCategory: (fromId: string, intoId: string) => void;
}

export const RabbAiChatWidget: React.FC<RabbAiChatWidgetProps> = ({
  data,
  onAddTransaction,
  onDeleteTransaction,
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
  const [confirmInputs, setConfirmInputs] = useState<Record<string, string>>({});

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (evt.target?.result) setSelectedImage(evt.target.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
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

    // Auto-log any extracted transaction immediately — no button needed
    if (aiMsg.extractedTransaction && typeof aiMsg.extractedTransaction.amount === 'number' && aiMsg.extractedTransaction.amount > 0) {
      const txId = `tx_rabbai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      onAddTransaction({
        id: txId,
        amount: aiMsg.extractedTransaction.amount,
        type: aiMsg.extractedTransaction.type,
        category: aiMsg.extractedTransaction.category,
        date: new Date().toISOString(),
        note: aiMsg.extractedTransaction.description,
        walletId: data.currentWalletId
      });
      aiMsg = {
        ...aiMsg,
        extractedTransaction: {
          ...aiMsg.extractedTransaction,
          isLogged: true,
          loggedTransactionId: txId
        }
      };
    }

    // Auto-execute EXPORT_CSV immediately — it's read-only, no confirm needed.
    // Embed the data: URI in the payload so it's persisted with the message.
    if (aiMsg.aiAction?.type === 'EXPORT_CSV' && !aiMsg.aiAction.executed) {
      const csvContent = generateTransactionsCsv(
        data.transactions,
        data.wallets,
        data.settings.currencySymbol || '$'
      );
      const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      aiMsg = {
        ...aiMsg,
        aiAction: { type: 'EXPORT_CSV', payload: { dataUri } as any, executed: true }
      };
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
  const handleUndoLog = (msgId: string, ext: NonNullable<RabbAiMessage['extractedTransaction']>) => {
    if (ext.loggedTransactionId) {
      onDeleteTransaction(ext.loggedTransactionId);
      patchMessage(msgId, { extractedTransaction: { ...ext, isLogged: false, loggedTransactionId: undefined } });
    }
  };

  const handleReLog = (msgId: string, ext: NonNullable<RabbAiMessage['extractedTransaction']>) => {
    const txId = `tx_rabbai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    onAddTransaction({
      id: txId,
      amount: ext.amount,
      type: ext.type,
      category: ext.category,
      date: new Date().toISOString(),
      note: ext.description,
      walletId: data.currentWalletId
    });
    patchMessage(msgId, { extractedTransaction: { ...ext, isLogged: true, loggedTransactionId: txId } });
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

    // ── DELETE_ALL_DATA: render username confirmation card ─────────────────
    if (action.type === 'DELETE_ALL_DATA') {
      if (action.executed) {
        return (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--status-success-fg)] bg-[var(--status-success-bg)] px-2.5 py-1.5 rounded-[6px] mt-2">
            <Check size={13} /> Data Wiped
          </div>
        );
      }

      const targetUserName = (action.payload?.userName || data.profile?.name || 'User').trim();
      const currentInput = confirmInputs[msg.id] || '';
      const isMatched = currentInput.trim().toLowerCase() === targetUserName.toLowerCase();

      return (
        <div className="pt-2 border-t border-rose-500/30 space-y-2 mt-2">
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-[8px] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 uppercase tracking-wide">
              <AlertCircle size={14} />
              <span>Danger: Wipe All Site Data</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
              Type your user name <span className="font-bold text-rose-400">"{targetUserName}"</span> to confirm permanent deletion:
            </p>
            <input
              type="text"
              value={currentInput}
              onChange={(e) => setConfirmInputs(prev => ({ ...prev, [msg.id]: e.target.value }))}
              placeholder={`Type "${targetUserName}"...`}
              className="w-full h-[32px] px-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[12px] text-[var(--text-primary)] focus:border-rose-500 outline-none font-bold placeholder:font-normal"
            />
          </div>
          <button
            onClick={() => {
              if (isMatched) {
                patchMessage(msg.id, { aiAction: { ...action, executed: true } });
                wipeAllSiteData();
              }
            }}
            disabled={!isMatched}
            className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:hover:bg-rose-600 text-white font-semibold text-[12px] rounded-[6px] flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Trash2 size={13} /> Confirm Delete All Data
          </button>
        </div>
      );
    }

    // ── EXPORT_CSV: render persistent download card ───────────────────────
    if (action.type === 'EXPORT_CSV') {
      const dataUri = (action.payload as any)?.dataUri as string | undefined;
      const filename = `trackxpense_${new Date().toISOString().split('T')[0]}.csv`;
      return (
        <div className="pt-2 border-t border-[var(--border-default)]/60 mt-2">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-3 rounded-[8px] space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)] uppercase tracking-wide">
              <Download size={13} strokeWidth={1.5} />
              <span className="font-semibold">Transaction Export</span>
            </div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">
              {data.transactions.length} transactions · CSV
            </div>
            {dataUri ? (
              <a
                href={dataUri}
                download={filename}
                className="btn btn--primary w-full h-[34px] text-[12px] flex items-center justify-center gap-1.5"
              >
                <Download size={13} /> Download {filename}
              </a>
            ) : (
              <div className="text-[11px] text-[var(--status-warning-fg)]">Export data unavailable — try again.</div>
            )}
          </div>
        </div>
      );
    }

    // ── Generic executed state ────────────────────────────────────────────
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
      description = `"${action.payload.from}" \u2192 "${action.payload.into}"`;
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
          className="fixed bottom-[calc(68px+env(safe-area-inset-bottom,0px))] right-3.5 sm:bottom-6 sm:right-6 z-[3999] h-[36px] px-3.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent-solid)] text-[var(--text-primary)] shadow-lg transition-all flex items-center gap-2 group active:scale-95"
          title="Open Assistant"
        >
          <div className="relative flex items-center justify-center">
            <img src="/rabAi icon.png" alt="RabbAi" className="w-3.5 h-3.5 object-contain" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
          </div>
          <span className="text-[12px] font-medium tracking-tight">RabbAi</span>
        </button>
      )}

      {isOpen && (
        <div 
          onPaste={handlePaste}
          className="fixed inset-x-0 top-0 bottom-[calc(54px+env(safe-area-inset-bottom,0px))] z-[3999] md:inset-x-auto md:right-0 md:top-0 md:w-[480px] md:border-l md:border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col shadow-2xl overflow-hidden text-[var(--text-primary)] animate-in slide-in-from-bottom duration-200"
        >
          
          {/* Header */}
          <div className="h-[48px] px-3.5 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <img src="/rabAi icon.png" alt="RabbAi" className="w-4 h-4 object-contain" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
              </div>
              <span className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">RabbAi</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setIsThreadDropdownOpen(!isThreadDropdownOpen)}
                  className="h-[28px] px-2.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-all"
                >
                  <MessageSquare size={12} strokeWidth={1.5} />
                  <span className="max-w-[90px] truncate">{activeConv?.title || 'Chat'}</span>
                  <ChevronDown size={12} />
                </button>

                {isThreadDropdownOpen && (
                  <div className="absolute right-0 top-8 w-[200px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-xl p-1.5 z-50 space-y-1">
                    <button
                      onClick={handleCreateNewThread}
                      className="w-full h-[30px] px-2.5 rounded-[6px] bg-[var(--accent-solid)] text-[var(--accent-text)] text-[11px] font-semibold flex items-center justify-between transition-all"
                    >
                      <span className="flex items-center gap-1.5"><Plus size={12} /> New Chat</span>
                    </button>
                    <div className="max-h-[180px] overflow-y-auto space-y-0.5 pt-0.5">
                      {conversations.map(c => (
                        <div
                          key={c.id}
                          onClick={() => { setActiveConvId(c.id); setIsThreadDropdownOpen(false); }}
                          className={`w-full h-[30px] px-2 rounded-[6px] text-[11px] flex items-center justify-between cursor-pointer transition-colors ${
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
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                title="Close"
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar text-[13px]">
            {activeConv?.messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] px-1">
                    <span>{isUser ? 'You' : 'RabbAi'}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className={`max-w-[88%] rounded-[8px] p-3 text-[13px] leading-relaxed border ${
                    isUser
                      ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-medium rounded-tr-none'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-default)] rounded-tl-none'
                  }`}>
                    {msg.imageUrl && (
                      <div className="rounded-[6px] overflow-hidden border border-white/20 max-h-[180px] mb-2">
                        <img src={msg.imageUrl} alt="Receipt Scan" className="w-full object-cover" />
                      </div>
                    )}

                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <MarkdownRenderer content={msg.text} />
                    )}

                    {/* Transaction auto-log confirmation */}
                    {msg.extractedTransaction && (
                      <div className="pt-2 border-t border-[var(--border-default)]/60 space-y-2 mt-2">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-2.5 rounded-[6px] space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                            <span>EXTRACTED RECORD</span>
                            <span className="text-[var(--status-success-fg)] font-semibold">{msg.extractedTransaction.type}</span>
                          </div>
                          <div className="flex items-center justify-between font-semibold font-mono text-[13px] text-[var(--text-primary)]">
                            <span>{msg.extractedTransaction.description}</span>
                            <span>{data.settings.currencySymbol || '$'}{msg.extractedTransaction.amount}</span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                            Category: {msg.extractedTransaction.category}
                          </div>
                        </div>
                        {msg.extractedTransaction.isLogged ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--status-success-fg)] bg-[var(--status-success-bg)] px-2.5 py-1.5 rounded-[6px] flex-1">
                              <Check size={13} /> Auto-logged to ledger
                            </div>
                            <button
                              onClick={() => handleUndoLog(msg.id, msg.extractedTransaction!)}
                              className="h-[28px] px-2.5 rounded-[6px] border border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10 transition-all shrink-0"
                            >
                              Undo
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleReLog(msg.id, msg.extractedTransaction!)}
                            className="w-full py-1.5 px-3 bg-[var(--accent-solid)] text-[var(--accent-text)] font-semibold text-[12px] rounded-[6px] flex items-center justify-center gap-1.5 transition-all"
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
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] p-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-pulse" />
                <span>Thinking...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick suggestions bar without top separator, larger pills, seamless side fade */}
          <div className="relative px-3 pt-1 pb-2 bg-[var(--bg-surface)] shrink-0 overflow-hidden">
            <div 
              className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap py-0.5"
              style={{
                maskImage: 'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(100% - 28px), transparent 100%)'
              }}
            >
              {[
                "Spending breakdown",
                "Runway estimate",
                "Log expense",
                "Recent outflows",
                "Export CSV"
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInputText(prompt); }}
                  className="h-[30px] px-3.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] whitespace-nowrap transition-all shrink-0 active:scale-95"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Image preview */}
          {selectedImage && (
            <div className="px-3 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <img src={selectedImage} alt="Preview" className="w-8 h-8 rounded object-cover border border-[var(--border-default)] shrink-0" />
                <span className="text-[11px] text-[var(--text-secondary)] truncate">Receipt ready for scan</span>
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
              title="Attach receipt"
            >
              <Paperclip size={15} strokeWidth={1.5} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

            <input
              type="text"
              placeholder="Ask anything, attach or paste screenshot..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              className="flex-1 h-[34px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-solid)]"
            />

            <button
              onClick={handleSend}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
              className="btn btn--primary h-[34px] px-3.5 text-[12px] flex items-center gap-1 shrink-0 font-medium"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
