import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  Waveform,
  ArrowDown
} from '@phosphor-icons/react';
import { SpotifyIcon } from '../shared/SpotifyIcon';
import { AiStarIcon } from '../shared/AiStarIcon';
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
import { StreamedMarkdownRenderer } from '../shared/StreamedMarkdownRenderer';
import { Haptics } from '../../services/haptics';
import { saveAs } from 'file-saver';

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
  onOpenSettings?: () => void;
  visualViewportHeight?: number | null;
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
  onClose,
  onOpenSettings,
  visualViewportHeight
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
  const [isFocused, setIsFocused] = useState(false);
  const [isActivelyTyping, setIsActivelyTyping] = useState(false);
  const typingTimerRef = useRef<any>(null);

  const isTypingActive = (isFocused && inputText.trim().length > 0) || isActivelyTyping;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const interimTranscriptRef = useRef<string>('');

  // Mobile Visual Viewport: Use parent's visualViewportHeight if provided, else listen locally
  const [localViewportHeight, setLocalViewportHeight] = useState<number | null>(null);
  const effectiveViewportHeight = visualViewportHeight !== undefined ? visualViewportHeight : localViewportHeight;

  useEffect(() => {
    if (visualViewportHeight !== undefined) return;
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleVisualViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      if (window.innerWidth < 1024) {
        setLocalViewportHeight(vv.height);
        if (window.scrollY !== 0) window.scrollTo(0, 0);
      } else {
        setLocalViewportHeight(null);
      }
    };

    window.visualViewport.addEventListener('resize', handleVisualViewportChange);
    window.visualViewport.addEventListener('scroll', handleVisualViewportChange);
    handleVisualViewportChange();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleVisualViewportChange);
    };
  }, [visualViewportHeight]);

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  const isKeyboardOpen = isMobile && (
    isFocused || 
    (effectiveViewportHeight !== null && typeof window !== 'undefined' && effectiveViewportHeight < window.innerHeight - 80)
  );

  // Track message IDs that have already finished typewriter streaming to avoid re-streaming past messages
  const [streamedMessageIds, setStreamedMessageIds] = useState<Set<string>>(() => {
    const targetConv = conversations.find(c => c.id === activeConvId) || (conversations.length > 0 ? conversations[0] : null);
    return new Set(targetConv?.messages?.map(m => m.id) || []);
  });

  const activeAnchorTargetRef = useRef<string | null>(null);

  const handleStreamComplete = useCallback((msgId: string) => {
    setStreamedMessageIds(prev => {
      if (prev.has(msgId)) return prev;
      const next = new Set(prev);
      next.add(msgId);
      return next;
    });
    activeAnchorTargetRef.current = null;
    if (spacerRef.current) {
      spacerRef.current.style.height = '0px';
    }
  }, []);

  // User scroll state tracking
  const [showScrollLatest, setShowScrollLatest] = useState(false);
  const isUserReadingHistoryRef = useRef(false);
  const scrolledUserMsgIdRef = useRef<string | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  const activeConv = conversations.find(c => c.id === activeConvId) || (conversations.length > 0 ? conversations[0] : null);
  const messages = activeConv?.messages || [];

  // Mark existing messages as streamed when switching conversations
  useEffect(() => {
    if (activeConv?.messages) {
      setStreamedMessageIds(prev => {
        let changed = false;
        const next = new Set(prev);
        activeConv.messages.forEach(m => {
          if (!next.has(m.id)) {
            next.add(m.id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [activeConvId]);

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

  // Identify the most recent message sent by the user
  const lastUserMsgId = useMemo(() => {
    for (let i = displayMessages.length - 1; i >= 0; i--) {
      if (displayMessages[i].sender === 'user') {
        return displayMessages[i].id;
      }
    }
    return null;
  }, [displayMessages]);

  // Dynamic bottom spacer calculation:
  // Dynamically expands only during message dispatch / AI generation so the prompt can glide to the top,
  // and smoothly collapses to 0 when idle so there is never an empty void below the conversation.
  const updateBottomSpacer = useCallback((targetMsgId?: string) => {
    if (!chatContainerRef.current || !spacerRef.current) return;
    const container = chatContainerRef.current;

    if (targetMsgId) {
      activeAnchorTargetRef.current = targetMsgId;
    }

    // When the conversation is completely idle (not loading, not analyzing, and no active anchor target):
    // Collapse the spacer to 0px. This strictly eliminates any empty void below the messages!
    if (!isLoading && !isAnalyzing && !activeAnchorTargetRef.current && !targetMsgId) {
      spacerRef.current.style.height = '0px';
      return;
    }

    const idToAnchor = targetMsgId || activeAnchorTargetRef.current || lastUserMsgId;
    if (!idToAnchor) {
      spacerRef.current.style.height = '0px';
      return;
    }

    const userMsgEl = container.querySelector<HTMLElement>(`[data-msg-id="${idToAnchor}"]`);
    if (!userMsgEl) {
      if (targetMsgId || activeAnchorTargetRef.current) {
        spacerRef.current.style.height = `${Math.max(250, container.clientHeight - 120)}px`;
      } else {
        spacerRef.current.style.height = '0px';
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const userRect = userMsgEl.getBoundingClientRect();

    // Invariant absolute top position of the target user prompt inside container's scroll content
    const userTopInContent = (userRect.top - containerRect.top) + container.scrollTop;

    // Target scrollTop to anchor the prompt 48px from top
    const targetScrollTop = Math.max(0, Math.round(userTopInContent - 48));

    // If the prompt is already at or near the top (e.g. first message in conversation),
    // no spacer is ever needed. This eliminates scrolling down into empty space!
    if (targetScrollTop <= 0) {
      spacerRef.current.style.height = '0px';
      return;
    }

    // Measure the actual scroll height of the container without the spacer
    const currentSpacerHeight = spacerRef.current ? spacerRef.current.getBoundingClientRect().height : 0;
    const scrollHeightWithoutSpacer = Math.max(0, container.scrollHeight - currentSpacerHeight);

    // Required scrollHeight so that container.scrollTop can reach targetScrollTop:
    // (targetScrollTop + container.clientHeight)
    const requiredScrollHeight = targetScrollTop + container.clientHeight;
    const needed = Math.max(0, Math.round(requiredScrollHeight - scrollHeightWithoutSpacer));

    spacerRef.current.style.height = `${needed}px`;
  }, [lastUserMsgId, isAnalyzing]);

  // Recalculate spacer whenever window resizes, messages change, or mobile keyboard toggles
  useEffect(() => {
    updateBottomSpacer();
    const handleResize = () => updateBottomSpacer();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateBottomSpacer, displayMessages, isLoading, isAnalyzing, effectiveViewportHeight]);

  // Top-anchored scroll: Positions the user's prompt right near the top of the reading pane (48px below top)
  const scrollToLatestPrompt = useCallback((msgId?: string, behavior: ScrollBehavior = 'smooth'): boolean => {
    if (!chatContainerRef.current) return false;
    const container = chatContainerRef.current;
    const targetId = msgId || lastUserMsgId;
    if (!targetId) return false;

    // Strictly match the target message element by ID
    const userMsgEl = container.querySelector<HTMLElement>(`[data-msg-id="${targetId}"]`);
    if (!userMsgEl) return false;

    // Ensure spacer is updated for this specific target message before scrolling
    updateBottomSpacer(targetId);

    // Native scrollIntoView with scroll-mt-12 pins the prompt cleanly at the top with smooth animation
    userMsgEl.scrollIntoView({
      block: 'start',
      behavior
    });

    scrolledUserMsgIdRef.current = targetId;
    return true;
  }, [lastUserMsgId, updateBottomSpacer]);

  // Guaranteed scroll dispatch: attempts immediately, then retries on RAF/timeouts until element exists in DOM
  const dispatchTopAnchorScroll = useCallback((targetId: string, behavior: ScrollBehavior = 'smooth') => {
    isUserReadingHistoryRef.current = false;
    setShowScrollLatest(false);

    // Ensure immediate scroll room for the pending message
    updateBottomSpacer(targetId);

    const tryScroll = (attemptsLeft: number) => {
      updateBottomSpacer(targetId);
      if (scrollToLatestPrompt(targetId, behavior)) return;
      if (attemptsLeft > 0) {
        requestAnimationFrame(() => {
          setTimeout(() => tryScroll(attemptsLeft - 1), 35);
        });
      }
    };

    tryScroll(10);
  }, [scrollToLatestPrompt, updateBottomSpacer]);

  const handleChatScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const currentScrollTop = el.scrollTop;
    const scrollDelta = currentScrollTop - lastScrollTopRef.current;
    lastScrollTopRef.current = currentScrollTop;

    // If the user manually scrolls while idle, release any artificial anchor spacer
    // so they never scroll down into empty space past the conversation!
    if (!isLoading && spacerRef.current && spacerRef.current.style.height !== '0px') {
      activeAnchorTargetRef.current = null;
      spacerRef.current.style.height = '0px';
    }

    if (!lastUserMsgId) {
      setShowScrollLatest(false);
      return;
    }

    const userMsgEl = el.querySelector<HTMLElement>(`[data-msg-id="${lastUserMsgId}"]`);
    if (!userMsgEl) {
      setShowScrollLatest(false);
      return;
    }

    const containerRect = el.getBoundingClientRect();
    const userRect = userMsgEl.getBoundingClientRect();
    const promptOffsetFromTop = userRect.top - containerRect.top;

    // If user scrolled up such that the latest exchange was pushed down by more than 160px
    const isScrolledUpFromLatest = promptOffsetFromTop > 160;

    if (scrollDelta < -5) {
      isUserReadingHistoryRef.current = true;
    } else if (Math.abs(promptOffsetFromTop - 48) < 40) {
      isUserReadingHistoryRef.current = false;
    }

    setShowScrollLatest(isScrolledUpFromLatest);
  }, [lastUserMsgId, isLoading]);

  // Streaming Auto-Follow: tracks ONLY active streaming text, ignoring thinking loader
  useEffect(() => {
    if (!chatContainerRef.current) return;
    const container = chatContainerRef.current;

    // Only track text while actually streaming characters, not during thinking loader
    const activeStreamEl = container.querySelector<HTMLElement>('[data-is-streaming="true"]');

    if (!activeStreamEl) return;

    const observer = new ResizeObserver(() => {
      updateBottomSpacer();

      if (isUserReadingHistoryRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const streamRect = activeStreamEl.getBoundingClientRect();

      const overflowBottom = streamRect.bottom - (containerRect.bottom - 72);
      if (overflowBottom > 0) {
        container.scrollTop += overflowBottom + 8;
      }
    });

    observer.observe(activeStreamEl);

    return () => {
      observer.disconnect();
    };
  }, [isLoading, displayMessages, updateBottomSpacer]);

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

  // Adjust scroll when virtual keyboard opens or screen resizes (with debounce to wait for keyboard animation)
  useEffect(() => {
    if (effectiveViewportHeight && typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
      if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
      const timer = setTimeout(() => {
        if (lastUserMsgId) {
          scrollToLatestPrompt(lastUserMsgId, 'smooth');
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [effectiveViewportHeight, lastUserMsgId, scrollToLatestPrompt]);

  const prevActiveConvIdRef = useRef<string | undefined>(undefined);

  // When switching conversations (or initial load), instantly position at the latest exchange with 'auto'
  useEffect(() => {
    if (prevActiveConvIdRef.current !== activeConvId) {
      prevActiveConvIdRef.current = activeConvId;
      if (lastUserMsgId) {
        scrolledUserMsgIdRef.current = lastUserMsgId;
        dispatchTopAnchorScroll(lastUserMsgId, 'auto');
      }
    }
  }, [activeConvId, lastUserMsgId, dispatchTopAnchorScroll]);

  // Auto-scroll whenever lastUserMsgId updates (e.g. newly dispatched prompt)
  useEffect(() => {
    if (!lastUserMsgId) return;

    if (scrolledUserMsgIdRef.current !== lastUserMsgId) {
      scrolledUserMsgIdRef.current = lastUserMsgId;
      dispatchTopAnchorScroll(lastUserMsgId, 'smooth');
    }
  }, [lastUserMsgId, dispatchTopAnchorScroll]);

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

    // Trigger active typing state with debounce
    setIsActivelyTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsActivelyTyping(false);
    }, 1200);

    // If user types @, show tag suggestions
    if (val.endsWith('@')) {
      setTagMenuOpen(true);
    } else if (tagMenuOpen && !val.includes('@')) {
      setTagMenuOpen(false);
    }

    const target = e.target;
    if (!val || val.length === 0) {
      target.style.height = '28px';
    } else {
      target.style.height = '28px';
      if (target.scrollHeight > 38) {
        target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
      }
    }
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

  // Cleanup audio tracks and typing timer on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
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
    Haptics.light();
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
    dispatchTopAnchorScroll(userMsg.id, 'smooth');

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
      Haptics.light();
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

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setIsActivelyTyping(false);
    setIsFocused(false);
    setInputText('');
    setSelectedImage(null);
    setTagMenuOpen(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
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
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setIsActivelyTyping(false);
      handleSend();
      return;
    }

    if (e.key !== 'Escape' && e.key !== 'Tab') {
      setIsActivelyTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setIsActivelyTyping(false);
      }, 1200);
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
          color: '#F6821F'
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
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `trackxpense_export_${new Date().toISOString().split('T')[0]}.csv`);
        break;
      }
      case 'DELETE_ALL_DATA': {
        if (updateData) {
          updateData({
            transactions: [],
            debts: [],
            provisions: [],
            templates: [],
            streaks: {},
            balanceHistory: [],
            recurringRules: [],
            settings: {
              ...data.settings,
              budgetLimits: {}
            }
          });
        }
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

  const isAiEnabled = Boolean(data.settings?.enableAiParsing);

  // Dedicated Zero-AI Manual Mode view when AI is turned off (default state)
  if (!isAiEnabled) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto animate-in fade-in select-none">
        <div className="mb-4">
          <AiStarIcon size={32} strokeWidth={1.5} className="text-[var(--text-muted)]" />
        </div>

        <span className="text-[10px] uppercase font-semibold tracking-[0.06em] text-[var(--text-muted)] block mb-1">
          Zero-AI Manual Mode
        </span>

        <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight mb-2">
          RabbAi Assistant is Off
        </h2>

        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-6">
          RabbAi is turned off by default. TrackXpense operates in strict manual mode with zero cloud AI inferences and complete local privacy. You can enable RabbAi anytime in Settings.
        </p>

        <div className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-4 text-left space-y-2.5 mb-6 text-[12px]">
          <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
            <Check size={14} strokeWidth={2} className="text-[var(--status-success-fg)] shrink-0 mt-0.5" />
            <span><strong>100% Private:</strong> Zero prompts or receipts are ever sent to cloud AI servers.</span>
          </div>
          <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
            <Check size={14} strokeWidth={2} className="text-[var(--status-success-fg)] shrink-0 mt-0.5" />
            <span><strong>Full Manual Ledger:</strong> Track, categorize, and budget expenses through your normal dashboard.</span>
          </div>
          <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
            <Check size={14} strokeWidth={2} className="text-[var(--status-success-fg)] shrink-0 mt-0.5" />
            <span><strong>Settings Control:</strong> Enable or disable anytime from the Settings menu.</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <button
            type="button"
            onClick={() => {
              if (onOpenSettings) {
                onOpenSettings();
              } else {
                updateData?.({
                  settings: {
                    ...data.settings,
                    enableAiParsing: true
                  }
                });
              }
            }}
            className="w-full h-[38px] rounded-[6px] bg-[var(--accent-solid)] text-[var(--accent-text)] text-[13px] font-medium hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 font-sans"
          >
            <span>Open Settings to Enable</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-[38px] rounded-[6px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] font-medium transition-colors cursor-pointer flex items-center justify-center"
          >
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full flex-1 min-h-0 flex flex-col h-full relative overflow-hidden select-none dot-matrix-canvas"
    >

      {/* Dynamic Glowing Dots Canvas (Exact 1:1 Phase Match with .dot-matrix-canvas) */}
      <div 
        aria-hidden="true"
        className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out z-0 dot-matrix-canvas--glow ${
          isTypingActive ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          maskImage: 'radial-gradient(ellipse 520px 140px at 50% calc(100% - 38px), black 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 520px 140px at 50% calc(100% - 38px), black 25%, transparent 75%)',
        }}
      />

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
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full max-w-full px-3 py-2 relative flex flex-col no-scrollbar z-10 scroll-smooth"
        style={{
          overflowAnchor: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 72px), transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 40px, black calc(100% - 72px), transparent 100%)'
        }}
      >
        
        {/* Landing State: Coins + Greeting + 5 Financial Suggestions */}
        {!hasMessages && (
          <div className="w-full max-w-md mx-auto my-auto flex flex-col items-center justify-center py-1 sm:py-2 space-y-2 sm:space-y-4 animate-in fade-in duration-300">
            
            {/* RabbAi Hero Icon */}
            <div className="relative flex items-center justify-center py-0.5 sm:py-2">
              <img 
                src="/rabAi icon.png" 
                alt="RabbAi" 
                className={`${isMobile && (isFocused || isKeyboardOpen) ? 'w-10 h-10' : 'w-14 h-14 sm:w-24 sm:h-24'} object-contain select-none transition-all duration-200`} 
              />
            </div>

            {/* Greeting */}
            <div className="text-center space-y-0.5 sm:space-y-1 px-2">
              <h2 className="text-[18px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">
                {greeting}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[var(--text-secondary)] leading-tight">
                A penny saved is peace of mind. Nu, what's doing with your gelt?
              </p>
            </div>

            {/* 5 Suggestion Pill Cards Stack - Disappears on phone when keyboard/compose box goes up */}
            <div className={`w-full space-y-1.5 sm:space-y-2 pt-0.5 sm:pt-1 transition-all duration-200 ${
              isMobile && (isFocused || isKeyboardOpen)
                ? 'hidden opacity-0 pointer-events-none'
                : 'block opacity-100'
            }`}>
              {suggestionCards.map((card, idx) => {
                const IconComp = card.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(card.prompt)}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className="w-full p-2 px-2.5 sm:p-2.5 sm:px-3 rounded-[8px] sm:rounded-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] hover:border-[var(--border-active)] flex items-center gap-2.5 sm:gap-3 transition-all cursor-pointer text-left group animate-in fade-in slide-in-from-bottom-2"
                  >
                    <IconComp size={15} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] sm:text-[12.5px] font-medium text-[var(--text-primary)] leading-tight truncate">
                        {card.title}
                      </div>
                      <div className="text-[10.5px] sm:text-[11px] text-[var(--text-muted)] leading-tight truncate mt-0.5">
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
          <div className="w-full max-w-2xl mx-auto space-y-5 pt-8 pb-12 sm:pb-14 overflow-x-hidden">
            {displayMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              
              if (isUser) {
                const isLastUser = msg.id === lastUserMsgId;
                const isEditing = editingMsgId === msg.id;
                return (
                  <div 
                    key={msg.id} 
                    data-msg-id={msg.id}
                    ref={isLastUser ? lastUserMessageRef : undefined}
                    data-user-message-last={isLastUser ? 'true' : undefined}
                    className="flex flex-col items-end space-y-1.5 group w-full max-w-full scroll-mt-12"
                  >
                    {isEditing ? (
                      <div className="w-full max-w-[85%] bg-[var(--bg-surface)] border border-[var(--accent)]/50 rounded-[12px] p-3 space-y-2.5 text-left shadow-lg">
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
                      <div className="max-w-[85%] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] px-3.5 py-2.5 space-y-2 shadow-sm text-left break-words">
                        {msg.imageUrl && (
                          <div className="rounded-[8px] overflow-hidden border border-[var(--border-default)] max-w-[240px]">
                            <img src={msg.imageUrl} alt="Uploaded receipt" className="w-full h-auto object-cover" />
                          </div>
                        )}
                        <div className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap break-words">
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

              const isLastAssistant = !isUser && msg.id === displayMessages[displayMessages.length - 1]?.id;
              const isStreamingNow = isLastAssistant && !streamedMessageIds.has(msg.id);

              return (
                <div 
                  key={msg.id} 
                  data-msg-id={msg.id} 
                  data-is-streaming={isStreamingNow ? 'true' : undefined}
                  className="flex flex-col items-start space-y-1.5 text-left group w-full max-w-full overflow-hidden"
                >
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

                  {/* Prose Body with Streamed Markdown */}
                  <div className="text-[13px] text-[var(--text-primary)] leading-relaxed pl-[42px] max-w-full break-words overflow-hidden">
                    <StreamedMarkdownRenderer 
                      content={msg.text} 
                      isStreaming={!streamedMessageIds.has(msg.id)}
                      onComplete={() => handleStreamComplete(msg.id)}
                      charsPerTick={5}
                      tickIntervalMs={24}
                    />
                  </div>

                  {/* Extracted Transaction Card */}
                  {msg.extractedTransaction && (
                    <div className="ml-[42px] w-[calc(100%-42px)] max-w-sm rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-3.5 space-y-2.5 box-border">
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
                  {msg.aiAction && (
                    <div className="ml-[42px] w-[calc(100%-42px)] max-w-sm rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-3.5 space-y-2.5 box-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--text-muted)]">
                          Proposed Action
                        </span>
                        {msg.aiAction.executed && (
                          <span className="text-[10px] uppercase font-mono text-[var(--status-success-fg)] flex items-center gap-1 font-medium">
                            <Check size={11} weight="bold" />
                            Executed
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--text-primary)] font-medium">
                        {msg.aiAction.type === 'SET_BUDGET' ? (
                          <span>Set Budget: <strong className="text-white">{(msg.aiAction.payload as any).category}</strong> → {data.settings?.currencySymbol || '$'}{(msg.aiAction.payload as any).limit} / {(msg.aiAction.payload as any).period || 'MONTHLY'}</span>
                        ) : msg.aiAction.type === 'DELETE_TRANSACTION' ? (
                          <span>Delete Transaction: <strong className="text-white">{(msg.aiAction.payload as any).description || 'Item'}</strong> {(msg.aiAction.payload as any).amount !== undefined ? `(${data.settings?.currencySymbol || '$'}${(msg.aiAction.payload as any).amount})` : ''}</span>
                        ) : msg.aiAction.type === 'DELETE_ALL_DATA' ? (
                          <span>Delete All Data</span>
                        ) : (
                          msg.aiAction.type.replace(/_/g, ' ')
                        )}
                      </p>
                      {msg.aiAction.executed ? (
                        <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
                            <Check size={13} weight="bold" className="text-[var(--status-success-fg)]" />
                            <span>Action completed</span>
                          </span>
                          <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Confirmed</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleExecuteAction(msg.id, msg.aiAction!)}
                          className={`btn ${
                            msg.aiAction.type === 'DELETE_TRANSACTION' ||
                            msg.aiAction.type === 'DELETE_ALL_DATA' ||
                            msg.aiAction.type === 'DELETE_CATEGORY' ||
                            msg.aiAction.type === 'DELETE_WALLET'
                              ? 'btn--danger'
                              : 'btn--primary'
                          } w-full h-[30px] text-[12px] rounded-[6px] font-medium cursor-pointer`}
                        >
                          {msg.aiAction.type === 'DELETE_TRANSACTION' || msg.aiAction.type === 'DELETE_ALL_DATA'
                            ? 'Confirm & Delete'
                            : msg.aiAction.type === 'DELETE_CATEGORY' || msg.aiAction.type === 'DELETE_WALLET'
                            ? 'Confirm Deletion'
                            : 'Confirm & Execute'}
                        </button>
                      )}
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
              <div 
                data-is-analyzing="true"
                className="flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)] pl-0.5 pt-2"
              >
                <CoinFlipLoader size={20} />
                <span className="text-[12px] text-[var(--text-secondary)]">RabbAi is thinking...</span>
              </div>
            )}

            <div ref={chatBottomRef} className="h-1 w-full" />

            {/* Dynamic Clamped Bottom Spacer: bridges only the gap needed to top-anchor the prompt, collapsing to 0 as AI answers */}
            <div ref={spacerRef} className="w-full pointer-events-none shrink-0 transition-[height] duration-300 ease-out" aria-hidden="true" />
          </div>
        )}

      </div>

      {/* Centered Scroll-to-Latest Floating Action Pill */}
      {showScrollLatest && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[88px] sm:bottom-[96px] z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              isUserReadingHistoryRef.current = false;
              setShowScrollLatest(false);
              dispatchTopAnchorScroll(lastUserMsgId || '', 'smooth');
            }}
            aria-label="Jump to latest exchange"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-active)] shadow-lg backdrop-blur-md transition-all duration-200 text-[11px] font-medium cursor-pointer animate-in fade-in slide-in-from-bottom-2 select-none"
          >
            <ArrowDown size={13} strokeWidth={1.5} />
            <span>Latest</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CLOUDFLARE COMPOSE BOX (EXACT SCREENSHOT STYLE)                             */}
      {/* ========================================================================= */}
      <div className="px-2 sm:px-3 pt-0 pb-[calc(2px+env(safe-area-inset-bottom,0px))] sm:pb-[calc(4px+env(safe-area-inset-bottom,0px))] shrink-0 z-20">
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
            <div className="mb-2 p-1.5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-xl text-[12px] space-y-1">
              <div className="text-[10px] uppercase font-mono text-[var(--text-muted)] px-2 py-0.5">
                Tag a wallet or category
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto no-scrollbar">
                {data.wallets.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => handleInsertTag(w.name)}
                    className="px-2 py-1 rounded-[4px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] text-[11px] text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1.5"
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
                    className="px-2 py-1 rounded-[4px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] text-[11px] text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <FolderSimple size={12} strokeWidth={1.5} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* The Compose Box with Dynamic Gradient Glow & Lit-up Dots while Typing */}
          <div className="relative w-full">
            {/* 1. Ambient Diffused Glow Aura (No scaling to eliminate height jitter) */}
            <div 
              aria-hidden="true"
              className={`absolute -inset-[2px] sm:-inset-[3px] rounded-[13px] sm:rounded-[15px] blur-[14px] sm:blur-[18px] transition-opacity duration-300 pointer-events-none ${
                isTypingActive ? 'opacity-70' : 'opacity-0'
              }`}
              style={{
                background: 'linear-gradient(135deg, #F6821F 0%, #FF7A00 25%, #FF3D71 55%, #A855F7 80%, #F6821F 100%)',
                backgroundSize: '250% 250%',
                animation: isTypingActive ? 'gradientGlowShift 4s ease infinite' : 'none',
              }}
            />

            {/* 3. Crisp 1px Gradient Border Frame */}
            <div 
              aria-hidden="true"
              className={`absolute -inset-[1px] rounded-[11px] sm:rounded-[13px] transition-opacity duration-300 pointer-events-none ${
                isTypingActive ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                background: 'linear-gradient(135deg, #F6821F 0%, #FF7A00 25%, #FF3D71 55%, #A855F7 80%, #F6821F 100%)',
                backgroundSize: '250% 250%',
                animation: isTypingActive ? 'gradientGlowShift 4s ease infinite' : 'none',
              }}
            />

            {/* 4. The Main Compose Box Interior (Stable 1px border, transitions colors only) */}
            <div 
              className={`relative z-10 w-full bg-[var(--bg-surface)] rounded-[10px] sm:rounded-[12px] p-2 sm:p-2.5 transition-colors duration-200 border ${
                isTypingActive 
                  ? 'border-transparent shadow-[0_0_24px_rgba(246,130,31,0.2)]' 
                  : 'border-[var(--accent)]/40 hover:border-[var(--accent)]/70'
              }`}
            >
              
              {/* Expanding Textarea (Locked 28px height to eliminate height jitter) */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setIsFocused(true);
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    if (window.scrollY !== 0) window.scrollTo(0, 0);
                    if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
                    if (document.body.scrollTop !== 0) document.body.scrollTop = 0;
                    if (hasMessages) {
                      setTimeout(() => scrollToLatestPrompt(lastUserMsgId || undefined, 'smooth'), 120);
                    }
                  }
                }}
                onBlur={() => setIsFocused(false)}
                placeholder="Type @ to tag a resource or ? for shortcuts"
                className="input-reset w-full bg-transparent border-0 outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed overflow-y-auto max-h-[140px] py-0.5"
                style={{ minHeight: '28px', height: '28px', border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
              />

            {/* Bottom Toolbar inside the box */}
            <div className="flex items-center justify-between pt-1.5 sm:pt-2">
              
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
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl max-w-md w-full p-4 space-y-3.5 text-[12.5px] animate-in fade-in zoom-in-95 duration-150">
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
