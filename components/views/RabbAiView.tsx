import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Microphone, 
  Check, 
  Sparkle,
  X,
  Receipt,
  Paperclip
} from '@phosphor-icons/react';
import { AppData, TransactionType, CategoryItem, WalletType } from '../../types';
import { 
  RabbAiConversation, 
  RabbAiMessage, 
  RabbAiAction,
  sendRabbAiTextMessage, 
  sendRabbAiImageMessage 
} from '../../services/rabbAiService';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { Haptics } from '../../services/haptics';

interface RabbAiViewProps {
  data: AppData;
  conversations: RabbAiConversation[];
  activeConvId: string;
  onUpdateConversations: (updated: RabbAiConversation[]) => void;
  onAddTransaction: (t: any) => void;
  onDeleteTransaction: (id: string) => void;
  onAddWallet: (name: string, type: WalletType, target: number, currency?: string) => void;
  onDeleteWallet: (id: string) => void;
  onAddCategory: (cat: Omit<CategoryItem, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onMergeCategory: (fromId: string, intoId: string) => void;
}

export const RabbAiView: React.FC<RabbAiViewProps> = ({
  data,
  conversations,
  activeConvId,
  onUpdateConversations,
  onAddTransaction,
  onDeleteTransaction,
  onAddWallet,
  onDeleteWallet,
  onAddCategory,
  onDeleteCategory,
  onMergeCategory
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dockedTextareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];
  const messages = activeConv?.messages || [];
  const hasMessages = messages.length > 0;

  // Auto-scroll on new messages
  useEffect(() => {
    if (hasMessages) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length, hasMessages]);

  // Adjust textarea height dynamically to support large paragraphs up to a limit (240px)
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > 6000) return; // 6,000 character upper limit
    setInputText(val);
    const target = e.target;
    target.style.height = 'auto';
    const newHeight = Math.min(Math.max(target.scrollHeight, 38), 240);
    target.style.height = `${newHeight}px`;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Haptics.light();
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Real Speech-to-Text Voice Recognition
  const toggleListening = () => {
    Haptics.light();
    setSpeechError(null);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 3500);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript}` : transcript;
          });
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
          }
          if (dockedTextareaRef.current) {
            dockedTextareaRef.current.style.height = 'auto';
            dockedTextareaRef.current.style.height = `${Math.min(dockedTextareaRef.current.scrollHeight, 240)}px`;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission denied.');
        } else {
          setSpeechError(`Voice error: ${event.error}`);
        }
        setTimeout(() => setSpeechError(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
      setSpeechError('Unable to start voice recording.');
      setTimeout(() => setSpeechError(null), 3500);
    }
  };

  const patchMessage = (msgId: string, patch: Partial<RabbAiMessage>) => {
    if (!activeConv) return;
    const updatedMessages = activeConv.messages.map(m => m.id === msgId ? { ...m, ...patch } : m);
    const updatedConv = { ...activeConv, messages: updatedMessages, updatedAt: new Date().toISOString() };
    const updated = conversations.map(c => c.id === activeConv.id ? updatedConv : c);
    onUpdateConversations(updated);
  };

  const handleSend = async (overrideText?: string) => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const textToSend = overrideText !== undefined ? overrideText : inputText;
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    Haptics.light();
    const userText = textToSend.trim();
    const userImg = selectedImage;
    setInputText('');
    setSelectedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    if (dockedTextareaRef.current) dockedTextareaRef.current.style.height = 'auto';

    const userMsg: RabbAiMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: userText,
      imageUrl: userImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentMessages = activeConv ? activeConv.messages : [];
    const updatedMessages = [...currentMessages, userMsg];
    let threadTitle = activeConv?.title || 'New Chat';
    if (threadTitle === 'New Chat' || threadTitle === 'Assistant') {
      threadTitle = userText.slice(0, 24) || 'Receipt Upload';
    }

    const updatedConv: RabbAiConversation = {
      id: activeConv?.id || `conv_${Date.now()}`,
      title: threadTitle,
      createdAt: activeConv?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: updatedMessages
    };

    const updatedAll = conversations.map(c => c.id === updatedConv.id ? updatedConv : c);
    if (!conversations.find(c => c.id === updatedConv.id)) {
      updatedAll.unshift(updatedConv);
    }
    onUpdateConversations(updatedAll);
    setIsLoading(true);

    try {
      let aiMsg: RabbAiMessage;
      if (userImg) {
        aiMsg = await sendRabbAiImageMessage(userImg, userText, data);
      } else {
        aiMsg = await sendRabbAiTextMessage(userText, updatedMessages, data);
      }

      if (aiMsg.extractedTransaction && aiMsg.extractedTransaction.isLogged) {
        const ext = aiMsg.extractedTransaction;
        const newTx = {
          amount: ext.amount,
          type: ext.type,
          category: ext.category,
          date: new Date().toISOString().split('T')[0],
          note: ext.description,
          walletId: data.currentWalletId || data.wallets?.[0]?.id || 'default'
        };
        onAddTransaction(newTx);
      }

      const finalMessages = [...updatedMessages, aiMsg];
      const finalConv = { ...updatedConv, messages: finalMessages, updatedAt: new Date().toISOString() };
      onUpdateConversations(conversations.map(c => c.id === finalConv.id ? finalConv : c));
    } catch (err: any) {
      const errorMsg: RabbAiMessage = {
        id: `err_${Date.now()}`,
        sender: 'rabbai',
        text: 'Sorry, I encountered an error communicating with the assistant. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalConv = { ...updatedConv, messages: [...updatedMessages, errorMsg], updatedAt: new Date().toISOString() };
      onUpdateConversations(conversations.map(c => c.id === finalConv.id ? finalConv : c));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUndoLog = (msgId: string, ext: NonNullable<RabbAiMessage['extractedTransaction']>) => {
    Haptics.light();
    if (ext.loggedTransactionId) {
      onDeleteTransaction(ext.loggedTransactionId);
    }
    patchMessage(msgId, {
      extractedTransaction: { ...ext, isLogged: false }
    });
  };

  const handleReLog = (msgId: string, ext: NonNullable<RabbAiMessage['extractedTransaction']>) => {
    Haptics.light();
    const newTx = {
      amount: ext.amount,
      type: ext.type,
      category: ext.category,
      date: new Date().toISOString().split('T')[0],
      note: ext.description,
      walletId: data.currentWalletId || data.wallets?.[0]?.id || 'default'
    };
    onAddTransaction(newTx);
    patchMessage(msgId, {
      extractedTransaction: { ...ext, isLogged: true }
    });
  };

  const handleExecuteAction = (msgId: string, action: RabbAiAction) => {
    Haptics.light();
    switch (action.type) {
      case 'ADD_CATEGORY':
        onAddCategory({
          name: action.payload.name,
          type: action.payload.categoryType === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
          color: '#E3993D'
        });
        break;
      case 'DELETE_CATEGORY': {
        const cat = data.categories.find(c => c.name.toLowerCase() === action.payload.name.toLowerCase());
        if (cat) onDeleteCategory(cat.id);
        break;
      }
      case 'ADD_WALLET':
        onAddWallet(action.payload.name, 'STANDARD', 0, action.payload.currency);
        break;
      case 'DELETE_WALLET': {
        const w = data.wallets.find(x => x.name.toLowerCase() === action.payload.name.toLowerCase());
        if (w) onDeleteWallet(w.id);
        break;
      }
      case 'MERGE_CATEGORY': {
        const fromCat = data.categories.find(c => c.name.toLowerCase() === action.payload.from.toLowerCase());
        const intoCat = data.categories.find(c => c.name.toLowerCase() === action.payload.into.toLowerCase());
        if (fromCat && intoCat) onMergeCategory(fromCat.id, intoCat.id);
        break;
      }
      case 'EXPORT_CSV': {
        const headers = ['ID', 'Date', 'Type', 'Category', 'Amount', 'Note', 'Wallet'];
        const rows = data.transactions.map(t => [
          t.id,
          t.date,
          t.type,
          t.category,
          t.amount,
          `"${(t.note || '').replace(/"/g, '""')}"`,
          data.wallets.find(w => w.id === t.walletId)?.name || 'Default'
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `trackxpense_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;
      }
    }
    patchMessage(msgId, {
      aiAction: { ...action, executed: true }
    });
  };

  const userName = data.profile?.name ? data.profile.name.split(' ')[0] : 'alif';

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent text-[var(--text-primary)] relative overflow-hidden select-none">
      
      {/* Hidden File Input for Receipt Attachment */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Main Viewport: Clean Centered Landing vs Scrollable Conversation */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 relative flex flex-col justify-center no-scrollbar">
        
        {/* Landing State: Clean Centered Gemini Style */}
        {!hasMessages && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center -mt-8 space-y-6 animate-in fade-in duration-300">
            
            {/* Center Heading (sentence case, 500 medium) */}
            <h1 className="text-[22px] md:text-[26px] font-medium text-[var(--text-primary)] tracking-[-0.011em] text-center">
              What can I help with, {userName}?
            </h1>

            {/* Compose Box container: 10px radius, 1px border, --field-bg */}
            <div className="w-full space-y-2">
              
              {/* Selected Image Badge */}
              {selectedImage && (
                <div className="relative inline-block">
                  <img src={selectedImage} alt="Receipt preview" className="w-14 h-14 object-cover rounded-[6px] border border-[var(--border-default)] shadow-xs" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/80 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              {/* Outer Compose Container: 10px radius, NO inner highlight */}
              <div className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] hover:border-[var(--border-active)] focus-within:border-[var(--field-border-focus)] rounded-[10px] p-3 transition-colors">
                
                {/* Textarea Input: Supports multi-paragraph text up to 240px limit */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask RabbAi"
                  className="input-reset w-full bg-transparent border-0 outline-none text-[13.5px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed overflow-y-auto max-h-[240px]"
                  style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                  autoFocus
                />

                {/* Toolbar Controls inside Compose Box (all 6px radius) */}
                <div className="flex items-center justify-between pt-2">
                  
                  {/* Left: Attach Receipt Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-[28px] px-2 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors flex items-center gap-1.5 text-[12px] cursor-pointer"
                    title="Attach receipt image"
                  >
                    <Paperclip size={14} strokeWidth={1.5} />
                    <span>Attach receipt</span>
                  </button>

                  {/* Right: Functional Voice Mic & Send Button */}
                  <div className="flex items-center gap-1.5">
                    
                    {/* Real Speech-to-Text Microphone Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`h-[28px] w-[28px] rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
                        isListening
                          ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                      title={isListening ? 'Listening... click to stop' : 'Click to speak'}
                    >
                      <Microphone size={15} strokeWidth={1.5} />
                    </button>

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={() => handleSend()}
                      disabled={(!inputText.trim() && !selectedImage) || isLoading}
                      className="btn btn--primary h-[28px] px-3 text-[12px] rounded-[6px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      title="Send message"
                    >
                      <span>Send</span>
                      <ArrowUp size={13} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Voice Status or Error Prompt */}
              {isListening && (
                <div className="text-[11px] text-red-400 flex items-center gap-1.5 px-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span>Listening... Speak your expense or request</span>
                </div>
              )}
              {speechError && (
                <div className="text-[11px] text-amber-400 px-1">
                  {speechError}
                </div>
              )}
            </div>

            {/* Quick Suggestion Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-1">
              {[
                { label: 'Log $15 lunch paid with Cash', prompt: 'Log an expense: $15 for Lunch paid with Cash today' },
                { label: 'Total spending this month', prompt: 'What is my total spending this month and what are my top categories?' },
                { label: 'Review recurring subscriptions', prompt: 'List all my active subscriptions and monthly recurring expenses' },
                { label: 'Export transactions to CSV', prompt: 'Export all my transactions to CSV' }
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt)}
                  className="px-3 py-2 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-hover)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-left transition-colors cursor-pointer truncate"
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>
        )}

        {/* Conversation Stream when user has entered messages */}
        {hasMessages && (
          <div className="max-w-2xl mx-auto w-full py-6 space-y-6 pb-28">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {!isUser ? (
                    <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center shrink-0 mt-0.5">
                      <img src="/rabAi icon.png" alt="RabbAi" className="w-3.5 h-3.5 object-contain" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-solid)] text-[var(--accent-text)] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className={`space-y-2 max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
                    {msg.imageUrl && (
                      <div className="rounded-[8px] overflow-hidden border border-[var(--border-default)] max-w-[240px]">
                        <img src={msg.imageUrl} alt="Uploaded receipt" className="w-full h-auto object-cover" />
                      </div>
                    )}

                    <div
                      className={`rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed transition-all ${
                        isUser
                          ? 'bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]'
                          : 'bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)]'
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      ) : (
                        <MarkdownRenderer content={msg.text} />
                      )}
                    </div>

                    {/* Extracted Transaction Card */}
                    {msg.extractedTransaction && (
                      <div className="p-3.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-left space-y-2 max-w-sm">
                        <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-1.5">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-muted)] flex items-center gap-1.5">
                            <Receipt size={13} strokeWidth={1.5} />
                            <span>Transaction Parsed</span>
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] font-medium ${
                            msg.extractedTransaction.type === TransactionType.EXPENSE ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {msg.extractedTransaction.type}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-bold font-mono tracking-tight text-[var(--text-primary)]">
                            {data.settings.currencySymbol}{msg.extractedTransaction.amount.toFixed(2)}
                          </span>
                          <span className="text-[12px] font-medium text-[var(--accent)]">
                            {msg.extractedTransaction.category}
                          </span>
                        </div>

                        {msg.extractedTransaction.description && (
                          <p className="text-[12px] text-[var(--text-secondary)] truncate">
                            {msg.extractedTransaction.description}
                          </p>
                        )}

                        <div className="pt-1">
                          {msg.extractedTransaction.isLogged ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                <Check size={12} weight="bold" />
                                <span>Recorded to ledger</span>
                              </span>
                              <button
                                onClick={() => handleUndoLog(msg.id, msg.extractedTransaction!)}
                                className="text-[11px] text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                              >
                                Undo
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleReLog(msg.id, msg.extractedTransaction!)}
                              className="btn btn--primary w-full h-[30px] text-[12px] rounded-[6px] cursor-pointer"
                            >
                              Log Transaction
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* AI Action Execution Card */}
                    {msg.aiAction && !msg.aiAction.executed && (
                      <div className="p-3 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-left space-y-2 max-w-sm">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-muted)]">
                          Proposed Action
                        </span>
                        <p className="text-[12px] text-[var(--text-primary)] font-medium">
                          {msg.aiAction.type.replace(/_/g, ' ')}
                        </p>
                        <button
                          onClick={() => handleExecuteAction(msg.id, msg.aiAction!)}
                          className="btn btn--primary w-full h-[30px] text-[12px] rounded-[6px] cursor-pointer"
                        >
                          Confirm & Execute
                        </button>
                      </div>
                    )}

                    <span className="text-[10px] text-[var(--text-muted)] px-1 block">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center shrink-0 mt-0.5">
                  <img src="/rabAi icon.png" alt="RabbAi" className="w-3.5 h-3.5 object-contain animate-pulse" />
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] px-3.5 py-2 text-[12.5px] text-[var(--text-secondary)] flex items-center gap-2">
                  <Sparkle size={13} className="text-[var(--accent)] animate-spin" />
                  <span>RabbAi is analyzing...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}
      </div>

      {/* Docked Compose Box (10px container, 6px controls) at the bottom when in conversation */}
      {hasMessages && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[var(--bg-page)] via-[var(--bg-page)]/95 to-transparent pt-6 pb-4 px-4 md:px-8 pointer-events-auto z-20">
          <div className="max-w-2xl mx-auto w-full space-y-1.5">
            {selectedImage && (
              <div className="relative inline-block">
                <img src={selectedImage} alt="Receipt preview" className="w-12 h-12 object-cover rounded-[6px] border border-[var(--border-default)]" />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/80 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            <div className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] hover:border-[var(--border-active)] focus-within:border-[var(--field-border-focus)] rounded-[10px] p-2.5 transition-colors">
              <textarea
                ref={dockedTextareaRef}
                rows={1}
                value={inputText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask RabbAi"
                className="input-reset w-full bg-transparent border-0 outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed overflow-y-auto max-h-[220px]"
                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
              />

              <div className="flex items-center justify-between pt-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[26px] px-2 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors flex items-center gap-1.5 text-[11.5px] cursor-pointer"
                  title="Attach receipt"
                >
                  <Paperclip size={13} strokeWidth={1.5} />
                  <span>Attach</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`h-[26px] w-[26px] rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                    title={isListening ? 'Listening...' : 'Voice input'}
                  >
                    <Microphone size={14} strokeWidth={1.5} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={(!inputText.trim() && !selectedImage) || isLoading}
                    className="btn btn--primary h-[26px] px-2.5 text-[11.5px] rounded-[6px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Send message"
                  >
                    <span>Send</span>
                    <ArrowUp size={12} weight="bold" />
                  </button>
                </div>
              </div>
            </div>

            {isListening && (
              <div className="text-[11px] text-red-400 flex items-center gap-1.5 px-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>Listening...</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
