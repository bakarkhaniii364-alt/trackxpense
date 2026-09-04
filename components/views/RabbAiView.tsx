import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  ArrowUp, 
  Microphone, 
  Check, 
  Sparkle,
  X,
  Receipt,
  Paperclip,
  Sliders,
  Faders,
  Info,
  TrendUp,
  Hourglass,
  Calendar,
  CreditCard,
  FolderSimple,
  Copy,
  PencilSimple,
  ArrowCounterClockwise,
  Waveform
} from '@phosphor-icons/react';
import { SpotifyIcon } from '../shared/SpotifyIcon';
import { CoinFlipLoader } from '../shared/CoinFlipLoader';
import { AppData, TransactionType, CategoryItem, WalletType } from '../../types';
import { 
  RabbAiConversation, 
  RabbAiMessage, 
  RabbAiAction,
  sendRabbAiTextMessage, 
  sendRabbAiImageMessage 
} from '../../services/rabbAiService';
import { GroqClient } from '../../services/groqClient';
import { MarkdownRenderer } from '../shared/MarkdownRenderer';
import { Haptics } from '../../services/haptics';

interface RabbAiViewProps {
  data: AppData;
  updateData?: (d: Partial<AppData>) => void;
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
  initialQuery?: string;
  initialImage?: string;
  onClearInitialQuery?: () => void;
  onSelectConversation?: (id: string) => void;
  onClose?: () => void;
}

export const RabbAiView: React.FC<RabbAiViewProps> = ({
  data,
  updateData,
  conversations,
  activeConvId,
  onUpdateConversations,
  onAddTransaction,
  onDeleteTransaction,
  onAddWallet,
  onDeleteWallet,
  onAddCategory,
  onDeleteCategory,
  onMergeCategory,
  initialQuery,
  initialImage,
  onClearInitialQuery,
  onSelectConversation,
  onClose
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [inputDates, setInputDates] = useState<Record<string, string>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const interimTranscriptRef = useRef<string>('');

  const activeConv = conversations.find(c => c.id === activeConvId) || (conversations.length > 0 ? conversations[0] : null);
  const messages = activeConv?.messages || [];

  // Provide immediate fallback for queries forwarded from dashboard before state hooks settle
  const displayMessages = useMemo(() => {
    if (messages.length > 0) return messages;
    if (initialQuery || initialImage) {
      return [{
        id: 'initial_pending_msg',
        sender: 'user' as const,
        text: initialQuery || '',
        imageUrl: initialImage || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }];
    }
    return [];
  }, [messages, initialQuery, initialImage]);

  const hasMessages = displayMessages.length > 0;
  const isAnalyzing = isLoading || Boolean(initialQuery || initialImage);

  // Time & Shabbat-based Jewish cultural greeting
  const greeting = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
    const hour = now.getHours();

    // Friday sundown (from 4pm) or Saturday Shabbat
    if ((day === 5 && hour >= 16) || day === 6) {
      return 'Shabbat Shalom.';
    }
    if (hour >= 5 && hour < 12) return 'Shalom, good morning.';
    if (hour >= 12 && hour < 18) return 'Shalom, good afternoon.';
    if (hour >= 18 && hour < 22) return 'Shalom, good evening.';
    return 'Shalom, good night.';
  }, []);

  const formatChatTime = (ts: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  // Auto-scroll on new messages
  useEffect(() => {
    if (hasMessages) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [displayMessages.length, hasMessages]);

  // Auto-send query if forwarded from search box or dashboard compose box (instant dispatch in a fresh conversation)
  useEffect(() => {
    if (initialQuery || initialImage) {
      const q = initialQuery || '';
      const img = initialImage || null;
      onClearInitialQuery?.();
      handleSend(q, img, []);
    }
  }, [initialQuery, initialImage]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > 6000) return;
    setInputText(val);

    // If user types @, show tag suggestions
    if (val.endsWith('@')) {
      setTagMenuOpen(true);
    } else if (tagMenuOpen && !val.includes('@')) {
      setTagMenuOpen(false);
    }

    const target = e.target;
    target.style.height = 'auto';
    target.style.height = `${Math.min(Math.max(target.scrollHeight, 28), 160)}px`;
  };

  const handleInsertTag = (tag: string) => {
    Haptics.light();
    setInputText(prev => prev.replace(/@\w*$/, `@${tag} `));
    setTagMenuOpen(false);
    textareaRef.current?.focus();
  };

  // Image Upload for Receipt
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

  // Cleanup audio tracks on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
    };
  }, []);

  const getSupportedAudioMimeType = (): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  };

  const stopListening = async () => {
    Haptics.light();
    setIsListening(false);

    // 1. Stop Web Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // 2. Stop MediaStream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    // 3. Stop MediaRecorder and transcribe with Whisper if needed
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        const capturedSpeech = interimTranscriptRef.current.trim();
        // If live Web Speech already captured speech, we are done
        if (capturedSpeech.length > 0) {
          setInputText(capturedSpeech);
          return;
        }

        // If Web Speech failed or was unsupported (e.g. mobile Safari PWA / Firefox Android / Brave), transcribe with Groq Whisper
        if (audioChunksRef.current.length > 0) {
          const mime = getSupportedAudioMimeType() || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mime });
          if (audioBlob.size > 800) {
            setIsTranscribing(true);
            try {
              const whisperResult = await GroqClient.transcribeAudio(audioBlob, data.settings?.groqApiKey);
              if (whisperResult && whisperResult.trim()) {
                setInputText(whisperResult.trim());
              }
            } catch (err) {
              console.warn('Whisper transcription error:', err);
            } finally {
              setIsTranscribing(false);
            }
          }
        }
      };

      try {
        recorder.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }
  };

  const startListening = async () => {
    Haptics.medium();
    setSpeechError(null);
    interimTranscriptRef.current = '';
    audioChunksRef.current = [];

    const hasMediaDevices = typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!hasMediaDevices && !SpeechRecognition) {
      setSpeechError('Microphone input is not supported in this browser.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    // 1. Initialize MediaRecorder (universal mobile browser recording)
    if (hasMediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        if (typeof MediaRecorder !== 'undefined') {
          const mimeType = getSupportedAudioMimeType();
          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          recorder.start(250);
          mediaRecorderRef.current = recorder;
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
          setTimeout(() => setSpeechError(null), 5000);
          return;
        }
        console.warn('Could not initialize MediaRecorder:', err);
      }
    }

    // 2. Concurrently run Web Speech API if supported for live text feedback
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          if (transcript) {
            interimTranscriptRef.current = transcript;
            setInputText(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Web Speech error:', event.error);
          if (!mediaRecorderRef.current) {
            setIsListening(false);
            if (event.error === 'not-allowed') {
              setSpeechError('Microphone permission denied. Please check browser settings.');
            } else if (event.error !== 'no-speech') {
              setSpeechError(`Voice error: ${event.error}`);
            }
            setTimeout(() => setSpeechError(null), 4000);
          }
        };

        recognition.onend = () => {
          if (!mediaRecorderRef.current) {
            setIsListening(false);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn('Web Speech start error:', e);
      }
    }

    setIsListening(true);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const patchMessage = (msgId: string, patch: Partial<RabbAiMessage>) => {
    if (!activeConv) return;
    const updatedMsgs = activeConv.messages.map(m => m.id === msgId ? { ...m, ...patch } : m);
    const updatedConv = { ...activeConv, messages: updatedMsgs, updatedAt: new Date().toISOString() };
    onUpdateConversations(conversations.map(c => c.id === updatedConv.id ? updatedConv : c));
  };

  // Copy text to clipboard with fallback
  const handleCopyMessage = async (msgId: string, text: string) => {
    Haptics.light();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  // Core message dispatching pipeline
  const executeSendMessage = async (
    userText: string,
    baseMessages: RabbAiMessage[],
    userImg?: string | null
  ) => {
    if (!userText.trim() && !userImg) return;
    if (isLoading) return;

    Haptics.light();

    let targetConv = conversations.find(c => c.id === activeConvId);
    if (!targetConv) {
      targetConv = {
        id: activeConvId || `conv_${Date.now()}`,
        title: userText.slice(0, 32) || 'New conversation',
        messages: [],
        updatedAt: new Date().toISOString()
      };
    }

    const userMsg: RabbAiMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text: userText,
      imageUrl: userImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...baseMessages, userMsg];
    const updatedConv: RabbAiConversation = {
      ...targetConv,
      title: baseMessages.length === 0 ? (userText.slice(0, 32) || 'New conversation') : targetConv.title,
      messages: updatedMessages,
      updatedAt: new Date().toISOString()
    };

    const exists = conversations.some(c => c.id === updatedConv.id);
    const newConversations = exists 
      ? conversations.map(c => c.id === updatedConv.id ? updatedConv : c)
      : [updatedConv, ...conversations];

    onUpdateConversations(newConversations);
    if (!exists) {
      onSelectConversation?.(updatedConv.id);
    }
    setIsLoading(true);

    try {
      let aiMsg: RabbAiMessage;
      if (userImg) {
        aiMsg = await sendRabbAiImageMessage(userImg, userText, data);
      } else {
        aiMsg = await sendRabbAiTextMessage(userText, updatedMessages, data);
      }

      if (aiMsg.extractedTransaction && aiMsg.extractedTransaction.isLogged && !aiMsg.extractedTransaction.needsDate) {
        const ext = aiMsg.extractedTransaction;
        const txId = ext.loggedTransactionId || `tx_rabbai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newTx = {
          id: txId,
          amount: ext.amount,
          type: ext.type,
          category: ext.category,
          date: ext.date || new Date().toISOString().split('T')[0],
          note: ext.description,
          walletId: data.currentWalletId || data.wallets?.[0]?.id || 'default'
        };
        onAddTransaction(newTx);
        aiMsg.extractedTransaction.loggedTransactionId = txId;
      }

      const finalMessages = [...updatedMessages, aiMsg];
      const finalConv = { ...updatedConv, messages: finalMessages, updatedAt: new Date().toISOString() };
      onUpdateConversations(newConversations.map(c => c.id === finalConv.id ? finalConv : c));
    } catch {
      const errorMsg: RabbAiMessage = {
        id: `err_${Date.now()}`,
        sender: 'rabbai',
        text: 'Sorry, I encountered an error communicating with the assistant. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalConv = { ...updatedConv, messages: [...updatedMessages, errorMsg], updatedAt: new Date().toISOString() };
      onUpdateConversations(newConversations.map(c => c.id === finalConv.id ? finalConv : c));
    } finally {
      setIsLoading(false);
    }
  };

  // Send message from compose bar
  const handleSend = async (
    overrideText?: string, 
    overrideImage?: string | null,
    baseMessagesOverride?: RabbAiMessage[]
  ) => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userText = (overrideText !== undefined ? overrideText : inputText).trim();
    const userImg = overrideImage !== undefined ? overrideImage : selectedImage;

    if (!userText && !userImg) return;

    setInputText('');
    setSelectedImage(null);
    setTagMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const baseMsgs = baseMessagesOverride !== undefined ? baseMessagesOverride : (activeConv?.messages || []);
    await executeSendMessage(userText, baseMsgs, userImg);
  };

  // Save edit of an existing user message: rolls back any transactions from this turn and re-generates
  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim() || !activeConv) return;
    const msgIndex = activeConv.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;

    // Roll back any transactions that were logged by messages from msgIndex onward
    const subsequentMessages = activeConv.messages.slice(msgIndex);
    subsequentMessages.forEach(m => {
      if (m.extractedTransaction?.loggedTransactionId) {
        onDeleteTransaction(m.extractedTransaction.loggedTransactionId);
      }
    });

    const priorMessages = activeConv.messages.slice(0, msgIndex);
    const textToSubmit = editText.trim();
    setEditingMsgId(null);
    setEditText('');

    await executeSendMessage(textToSubmit, priorMessages);
  };

  // Retry / Regenerate assistant response: finds the triggering user prompt and re-executes
  const handleRetry = async (assistantMsgId: string) => {
    if (!activeConv || isLoading) return;
    const msgIndex = activeConv.messages.findIndex(m => m.id === assistantMsgId);
    if (msgIndex === -1) return;

    // Roll back any transaction logged by this assistant message before retrying
    const assistantMsg = activeConv.messages[msgIndex];
    if (assistantMsg?.extractedTransaction?.loggedTransactionId) {
      onDeleteTransaction(assistantMsg.extractedTransaction.loggedTransactionId);
    }

    let userMsg: RabbAiMessage | null = null;
    let priorMessages: RabbAiMessage[] = [];
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (activeConv.messages[i].sender === 'user') {
        userMsg = activeConv.messages[i];
        priorMessages = activeConv.messages.slice(0, i);
        break;
      }
    }

    if (!userMsg) return;

    await executeSendMessage(userMsg.text, priorMessages, userMsg.imageUrl);
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

  const handleConfirmWithDate = (
    msgId: string, 
    ext: NonNullable<RabbAiMessage['extractedTransaction']>,
    chosenDate: string
  ) => {
    Haptics.success();
    const newTx = {
      amount: ext.amount,
      type: ext.type,
      category: ext.category,
      date: chosenDate,
      note: ext.description,
      walletId: data.currentWalletId || data.wallets?.[0]?.id || 'default'
    };
    onAddTransaction(newTx);
    patchMessage(msgId, {
      extractedTransaction: { ...ext, date: chosenDate, needsDate: false, isLogged: true }
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
      case 'SET_BUDGET': {
        if (updateData) {
          const currentLimits = data.settings?.budgetLimits || {};
          const newLimits = {
            ...currentLimits,
            [action.payload.category]: {
              limit: action.payload.limit,
              period: action.payload.period || 'MONTHLY'
            }
          };
          updateData({
            settings: {
              ...data.settings,
              budgetLimits: newLimits
            }
          });
        }
        break;
      }
      case 'DELETE_TRANSACTION': {
        const payload = action.payload as { transactionId?: string; description?: string; amount?: number };
        if (payload.transactionId) {
          onDeleteTransaction(payload.transactionId);
        } else {
          const match = data.transactions.find(t => {
            const matchesAmount = !payload.amount || Math.abs(t.amount - payload.amount) < 0.01;
            const matchesDesc = !payload.description || (t.note && t.note.toLowerCase().includes(payload.description.toLowerCase())) || t.category.toLowerCase().includes(payload.description.toLowerCase());
            return matchesAmount && matchesDesc;
          });
          if (match) {
            onDeleteTransaction(match.id);
          }
        }
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

  // TrackXpense Financial Suggestion Cards
  const suggestionCards = [
    {
      icon: TrendUp,
      title: 'Spending breakdown',
      subtitle: 'Audit recent expenses across categories',
      prompt: 'Analyze my spending this week and highlight which categories had the largest expenses'
    },
    {
      icon: Hourglass,
      title: 'Runway & cashflow',
      subtitle: 'Check days of runway & burn rate',
      prompt: 'How many days of financial runway do I have left based on my current balance and burn rate?'
    },
    {
      icon: SpotifyIcon,
      title: 'Recurring charges',
      subtitle: 'Review subscriptions & recurring bills',
      prompt: 'List all my active subscriptions, recurring expenses, and upcoming charges'
    },
    {
      icon: Receipt,
      title: 'Log an expense',
      subtitle: 'Quick-record an outflow to your ledger',
      prompt: 'Log an expense: $18 for Lunch paid with Cash today'
    },
    {
      icon: Sliders,
      title: 'Budget health check',
      subtitle: 'Inspect category spending limits',
      prompt: 'Check my category budget limits and tell me if any are nearing or exceeding thresholds'
    }
  ];

  return (
    <div 
      className="w-full flex-1 flex flex-col h-full relative overflow-hidden select-none bg-transparent"
    >
      
      {/* Hidden File Input for Receipt Attachment */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* CENTER WORKSPACE: Dot-Matrix Canvas with Landing State or Message Stream   */}
      {/* ========================================================================= */}
      <div 
        className="flex-1 overflow-y-auto px-3 py-2 relative flex flex-col no-scrollbar"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 48px, black calc(100% - 24px), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 48px, black calc(100% - 24px), transparent 100%)'
        }}
      >
        
        {/* Landing State: Coins + Greeting + 5 Financial Suggestions */}
        {!hasMessages && (
          <div className="w-full max-w-md mx-auto my-auto flex flex-col items-center justify-center py-2 space-y-4 animate-in fade-in duration-300">
            
            {/* RabbAi Hero Icon */}
            <div className="relative flex items-center justify-center py-2">
              <img 
                src="/rabAi icon.png" 
                alt="RabbAi" 
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain select-none" 
              />
            </div>

            {/* Greeting */}
            <div className="text-center space-y-1">
              <h2 className="text-[20px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">
                {greeting}
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)]">
                A penny saved is peace of mind. Nu, what's doing with your gelt?
              </p>
            </div>

            {/* 5 Suggestion Pill Cards Stack */}
            <div className="w-full space-y-2 pt-1">
              {suggestionCards.map((card, idx) => {
                const IconComp = card.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(card.prompt)}
                    className="w-full p-2.5 px-3 rounded-[10px] bg-[#121216]/80 hover:bg-[#18181e] border border-[var(--border-default)] hover:border-[var(--border-active)] flex items-center gap-3 transition-all cursor-pointer text-left group"
                  >
                    <IconComp size={16} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium text-[var(--text-primary)] leading-tight truncate">
                        {card.title}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] leading-tight truncate mt-0.5">
                        {card.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* Message Stream */}
        {hasMessages && (
          <div className="w-full max-w-2xl mx-auto space-y-5 pt-8 pb-6">
            {displayMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              
              if (isUser) {
                const isEditing = editingMsgId === msg.id;
                return (
                  <div key={msg.id} className="flex flex-col items-end space-y-1.5 group max-w-full">
                    {isEditing ? (
                      <div className="w-full max-w-[85%] bg-[#141418] border border-[var(--accent)]/50 rounded-[12px] p-3 space-y-2.5 text-left shadow-lg">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(msg.id);
                            } else if (e.key === 'Escape') {
                              setEditingMsgId(null);
                            }
                          }}
                          rows={2}
                          className="w-full bg-transparent border-0 outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-default)]">
                          <button
                            type="button"
                            onClick={() => setEditingMsgId(null)}
                            className="h-[24px] px-2 rounded-[4px] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            disabled={!editText.trim()}
                            className="btn btn--primary h-[24px] px-2.5 rounded-[4px] text-[11px] font-medium disabled:opacity-40 cursor-pointer"
                          >
                            Save &amp; Submit
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-w-[85%] bg-[#1a1a22] border border-[var(--border-default)] rounded-[12px] px-3.5 py-2.5 space-y-2 shadow-sm text-left">
                        {msg.imageUrl && (
                          <div className="rounded-[8px] overflow-hidden border border-[var(--border-default)] max-w-[240px]">
                            <img src={msg.imageUrl} alt="Uploaded receipt" className="w-full h-auto object-cover" />
                          </div>
                        )}
                        <div className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </div>
                      </div>
                    )}

                    {/* User Action Bar: Time, Copy, Edit */}
                    {!isEditing && (
                      <div className="flex items-center gap-2 pr-1 text-[10px] text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-opacity">
                        <span className="font-mono">{formatChatTime(msg.timestamp)}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
                          title="Copy message"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span className="text-emerald-400 text-[10px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} strokeWidth={1.5} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMsgId(msg.id);
                            setEditText(msg.text);
                          }}
                          className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer p-0.5"
                          title="Edit message"
                        >
                          <PencilSimple size={11} strokeWidth={1.5} />
                          <span>Edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col items-start space-y-1.5 text-left group">
                  {/* Assistant Header */}
                  <div className="flex items-center gap-2.5 text-[12px] font-medium text-[var(--text-muted)] pl-0.5">
                    <img 
                      src="/rabAi icon.png" 
                      alt="RabbAi" 
                      className="w-8 h-8 object-contain shrink-0 select-none" 
                    />
                    <div className="flex items-center gap-2">
                      <span className="tracking-wide text-[var(--text-primary)] font-medium">RabbAi</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {formatChatTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Prose Body */}
                  <div className="text-[13px] text-[#E4E4E7] leading-relaxed pl-[42px] max-w-full">
                    <MarkdownRenderer content={msg.text} />
                  </div>

                  {/* Extracted Transaction Card */}
                  {msg.extractedTransaction && (
                    <div className="ml-[42px] w-full max-w-sm rounded-[10px] bg-[#141418] border border-[var(--border-default)] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-1.5">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                          <Receipt size={12} strokeWidth={1.5} />
                          <span>Transaction Details</span>
                        </span>
                        <span className={`pill text-[10px] py-0.5 px-2 ${
                          msg.extractedTransaction.type === TransactionType.EXPENSE ? 'pill--error' : 'pill--success'
                        }`}>
                          {msg.extractedTransaction.type}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-[17px] font-bold font-mono tracking-tight text-[var(--text-primary)]">
                          {data.settings.currencySymbol}{msg.extractedTransaction.amount.toFixed(2)}
                        </span>
                        <span className="pill pill--muted text-[11px] py-0.5 px-2.5">
                          {msg.extractedTransaction.category}
                        </span>
                      </div>

                      {msg.extractedTransaction.description && (
                        <p className="text-[12px] text-[var(--text-secondary)] truncate">
                          {msg.extractedTransaction.description}
                        </p>
                      )}

                      {/* If date is missing on receipt, ask user for the date with picker */}
                      {msg.extractedTransaction.needsDate ? (
                        <div className="pt-2 space-y-2 border-t border-[var(--border-default)]">
                          <div className="text-[11px] text-[var(--status-warning-fg)] flex items-center gap-1.5 font-medium">
                            <Calendar size={13} strokeWidth={1.5} />
                            <span>Date missing on receipt. Select purchase date:</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={inputDates[msg.id] || new Date().toISOString().split('T')[0]}
                              onChange={(e) => setInputDates(prev => ({ ...prev, [msg.id]: e.target.value }))}
                              className="bg-[var(--bg-subtle)] text-[12px] text-[var(--text-primary)] px-2.5 py-1 rounded-[6px] border border-[var(--border-default)] focus:border-[var(--accent)] outline-none flex-1 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmWithDate(
                                msg.id, 
                                msg.extractedTransaction!, 
                                inputDates[msg.id] || new Date().toISOString().split('T')[0]
                              )}
                              className="btn btn--primary text-[11px] h-[28px] px-2.5 rounded-[6px] font-medium cursor-pointer shrink-0"
                            >
                              Confirm &amp; Log
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-1">
                          {msg.extractedTransaction.isLogged ? (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                <Check size={12} weight="bold" />
                                <span>Recorded ({msg.extractedTransaction.date || 'Today'})</span>
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
                              className="btn btn--primary w-full h-[28px] text-[11.5px] rounded-[6px] cursor-pointer"
                            >
                              Log Transaction
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Action Execution Card */}
                  {msg.aiAction && !msg.aiAction.executed && (
                    <div className="ml-[42px] w-full max-w-sm rounded-[10px] bg-[#141418] border border-[var(--border-default)] p-3.5 space-y-2">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-muted)]">
                        Proposed Action
                      </span>
                      <p className="text-[12px] text-[var(--text-primary)] font-medium">
                        {msg.aiAction.type === 'SET_BUDGET' ? (
                          <span>Set Budget: <strong className="text-white">{(msg.aiAction.payload as any).category}</strong> → {data.settings?.currencySymbol || '$'}{(msg.aiAction.payload as any).limit} / {(msg.aiAction.payload as any).period || 'MONTHLY'}</span>
                        ) : msg.aiAction.type === 'DELETE_TRANSACTION' ? (
                          <span>Delete Transaction: <strong className="text-white">{(msg.aiAction.payload as any).description || 'Item'}</strong> {(msg.aiAction.payload as any).amount !== undefined ? `(${data.settings?.currencySymbol || '$'}${(msg.aiAction.payload as any).amount})` : ''}</span>
                        ) : (
                          msg.aiAction.type.replace(/_/g, ' ')
                        )}
                      </p>
                      <button
                        onClick={() => handleExecuteAction(msg.id, msg.aiAction!)}
                        className={`w-full h-[28px] text-[11.5px] rounded-[6px] font-medium cursor-pointer transition-colors ${
                          msg.aiAction.type === 'DELETE_TRANSACTION' || msg.aiAction.type === 'DELETE_ALL_DATA'
                            ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 hover:bg-[var(--status-error-fg)] hover:text-white'
                            : 'btn btn--primary'
                        }`}
                      >
                        {msg.aiAction.type === 'DELETE_TRANSACTION' ? 'Confirm Deletion' : 'Confirm & Execute'}
                      </button>
                    </div>
                  )}

                  {/* Assistant Actions: Copy & Retry */}
                  <div className="flex items-center gap-3 pl-[42px] pt-1 text-[11px] text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-white/5"
                      title="Copy response"
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400 text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} strokeWidth={1.5} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRetry(msg.id)}
                      disabled={isLoading}
                      className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-white/5 disabled:opacity-40"
                      title="Regenerate response"
                    >
                      <ArrowCounterClockwise size={12} strokeWidth={1.5} className={isLoading ? 'animate-spin' : ''} />
                      <span>Retry</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {isAnalyzing && (
              <div className="flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)] pl-0.5">
                <CoinFlipLoader size={20} />
                <span className="text-[12px] text-[var(--text-secondary)]">RabbAi is thinking...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* CLOUDFLARE COMPOSE BOX (EXACT SCREENSHOT STYLE)                             */}
      {/* ========================================================================= */}
      <div className="p-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] shrink-0 z-20">
        <div className="w-full max-w-2xl mx-auto">
          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="relative inline-block mb-2">
              <img src={selectedImage} alt="Receipt preview" className="w-12 h-12 object-cover rounded-[6px] border border-[var(--border-default)]" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/80 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {/* Tagging autocomplete popover if user types @ */}
          {tagMenuOpen && (
            <div className="mb-2 p-1.5 bg-[#141418] border border-[var(--border-default)] rounded-[8px] shadow-xl text-[12px] space-y-1">
              <div className="text-[10px] uppercase font-mono text-[var(--text-muted)] px-2 py-0.5">
                Tag a wallet or category
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto no-scrollbar">
                {data.wallets.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleInsertTag(w.name)}
                    className="px-2 py-1 rounded-[4px] bg-[#1e1e24] hover:bg-[var(--accent)] hover:text-white text-[11px] text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <CreditCard size={12} strokeWidth={1.5} />
                    <span>{w.name}</span>
                  </button>
                ))}
                {data.categories.slice(0, 6).map(c => (
                  <button
                    key={c.id || c.name}
                    type="button"
                    onClick={() => handleInsertTag(c.name)}
                    className="px-2 py-1 rounded-[4px] bg-[#1e1e24] hover:bg-[var(--accent)] hover:text-white text-[11px] text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FolderSimple size={12} strokeWidth={1.5} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* The Outer Box with Cloudflare Orange / Active Border */}
          <div className="w-full bg-[#0e0e12] border border-[var(--accent)]/40 hover:border-[var(--accent)]/70 focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30 rounded-[12px] p-2.5 transition-all">
            
            {/* Expanding Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Type @ to tag a resource or ? for shortcuts"
              className="input-reset w-full bg-transparent border-0 outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed overflow-y-auto max-h-[140px] py-0.5"
              style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
            />

            {/* Bottom Toolbar inside the box */}
            <div className="flex items-center justify-between pt-2">
              
              {/* Left: Attachment Paperclip + Voice Mic */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[28px] px-2 sm:h-[24px] sm:px-1.5 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                  title="Attach receipt image"
                >
                  <Paperclip size={13} strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`h-[28px] w-[28px] sm:h-[24px] sm:w-[24px] rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-500/25 text-red-400 ring-1 ring-red-500/50 animate-pulse'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                  title={isListening ? 'Stop listening' : 'Dictate with voice (mobile supported)'}
                >
                  <Microphone size={15} strokeWidth={1.5} />
                </button>
              </div>

              {/* Right: Settings/Shortcuts & Orange Circular Send Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupportModalOpen(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 transition-colors cursor-pointer"
                  title="AI settings & shortcuts"
                >
                  <Faders size={14} strokeWidth={1.5} />
                </button>

                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={(!inputText.trim() && !selectedImage) || isLoading}
                  className="w-7 h-7 rounded-full bg-[var(--accent)] hover:brightness-110 active:scale-95 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                  title="Send query"
                >
                  <ArrowUp size={14} weight="bold" />
                </button>
              </div>

            </div>
          </div>

          {/* Real-time Voice Listening Prompt */}
          {isListening && (
            <div className="flex items-center justify-between px-3 py-1.5 mt-2 bg-red-500/10 border border-red-500/30 rounded-[8px] text-[12px] text-red-400 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                <span className="truncate font-medium">Listening... Speak your expense</span>
              </div>
              <button
                type="button"
                onClick={stopListening}
                className="text-[11px] bg-red-500/25 hover:bg-red-500/40 text-red-200 px-2.5 py-0.5 rounded-[4px] font-medium cursor-pointer shrink-0 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {isTranscribing && (
            <div className="flex items-center gap-2 px-3 py-1.5 mt-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[8px] text-[12px] text-[var(--text-secondary)] animate-pulse">
              <Waveform size={14} className="animate-spin text-[var(--accent)] shrink-0" />
              <span>Transcribing audio with Whisper AI...</span>
            </div>
          )}

          {speechError && (
            <div className="flex items-center justify-between px-3 py-1.5 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-[8px] text-[11.5px] text-amber-300">
              <span className="min-w-0 pr-2">{speechError}</span>
              <button 
                type="button" 
                onClick={() => setSpeechError(null)}
                className="text-[10px] uppercase font-mono text-amber-300 hover:text-white shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUPPORT & FAQ MODAL                                                       */}
      {/* ========================================================================= */}
      {isSupportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <div className="bg-[#141418] border border-[var(--border-default)] rounded-[12px] shadow-2xl max-w-md w-full p-4 space-y-3.5 text-[12.5px] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-2.5">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-[var(--accent)]" />
                <span className="font-medium text-[13px] text-[var(--text-primary)]">RabbAi Assistant Support</span>
              </div>
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2 text-[var(--text-secondary)] leading-relaxed">
              <p>
                <strong className="text-[var(--text-primary)]">Smart Logging:</strong> Type natural language like <code className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono text-[var(--text-primary)]">$15 for Lunch with Cash</code> to automatically parse and log transactions.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Receipt Scanning:</strong> Attach receipt photos using the paperclip button. RabbAi reads totals, vendors, and dates.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Resource Tagging:</strong> Type <code className="bg-white/10 px-1 py-0.5 rounded text-[11px] font-mono text-[var(--text-primary)]">@</code> to quickly tag wallets or categories.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Voice Input:</strong> Click the microphone to speak your expense without typing.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsSupportModalOpen(false)}
                className="btn btn--primary h-[28px] px-3 text-[11.5px] rounded-[6px]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
