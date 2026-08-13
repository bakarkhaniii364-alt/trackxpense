import { AppData, TransactionType } from '../types';

export interface RabbAiMessage {
  id: string;
  sender: 'user' | 'rabbai';
  text: string;
  imageUrl?: string;
  timestamp: string;
  extractedTransaction?: {
    amount: number;
    category: string;
    description: string;
    type: TransactionType;
    isLogged?: boolean;
  };
}

export interface RabbAiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: RabbAiMessage[];
}

const STORAGE_KEY = 'trackxpense_rabbai_conversations';
const DEFAULT_GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

/**
 * Load all stored RabbAi conversation threads from localStorage.
 */
export function loadRabbAiConversations(): RabbAiConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load RabbAi conversations:', err);
  }

  // Initial default conversation
  const initialThread: RabbAiConversation = {
    id: `conv_${Date.now()}`,
    title: 'Financial Coaching & Receipts',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: 'Hello! I am RabbAi, your personal AI financial assistant. Ask me anything about your balance, or snap/upload a receipt photo for instant OCR logging!',
        timestamp: new Date().toISOString()
      }
    ]
  };
  saveRabbAiConversations([initialThread]);
  return [initialThread];
}

/**
 * Save RabbAi conversations to local storage.
 */
export function saveRabbAiConversations(conversations: RabbAiConversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.warn('Failed to save RabbAi conversations:', err);
  }
}

/**
 * Send text message to RabbAi using Groq llama-3.1-8b-instant with crash-proof JSON parsing
 * and context-poisoning prevention.
 */
export async function sendRabbAiTextMessage(
  userText: string,
  history: RabbAiMessage[],
  data: AppData
): Promise<RabbAiMessage> {
  const apiKey = data.settings.groqApiKey || DEFAULT_GROQ_KEY;

  const income = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const categories = (data.categories || []).map(c => c.name).join(', ');

  const systemPrompt = `You are RabbAi, a helpful, intelligent financial assistant for the app TrackXpense.
User Financial Summary:
- Current Wallet Balance: ${data.settings.currencySymbol || '$'}${balance}
- Total Income: ${data.settings.currencySymbol || '$'}${income}
- Total Expenses: ${data.settings.currencySymbol || '$'}${expense}
- Available Categories: ${categories}

Instructions:
1. Provide concise, friendly, helpful advice.
2. If the user expresses an intent to log a transaction (e.g. "I spent 45 on groceries"), return a JSON block at the end formatted like:
   \`\`\`json
   {
     "amount": 45,
     "category": "Groceries",
     "description": "Groceries",
     "type": "EXPENSE"
   }
   \`\`\`
3. If user denies or cancels a transaction ("I didn't spend 200"), politely acknowledge that you won't log it and DO NOT include the json block.`;

  // Context Poisoning Prevention: filter history turns to avoid sending failed/refusal error texts back to API
  const sanitizedHistory = history
    .filter(m => m.text && !m.text.includes("couldn't process that phrasing") && !m.text.includes("Offline mode active"))
    .slice(-6)
    .map(m => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text
    }));

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...sanitizedHistory,
    { role: 'user', content: userText }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.2,
        messages: messagesPayload
      })
    });

    if (response.ok) {
      let resJson: any = null;
      try {
        resJson = await response.json();
      } catch (e) {
        console.warn('Groq API response was not valid JSON:', e);
      }

      if (resJson) {
        const rawContent = resJson.choices?.[0]?.message?.content || 'I processed your request.';

        // Extract optional transaction json block with strict try/catch
        let extracted: RabbAiMessage['extractedTransaction'] = undefined;
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        let cleanText = rawContent.replace(/```json\s*([\s\S]*?)\s*```/g, '').trim();

        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (typeof parsed.amount === 'number' && parsed.amount > 0) {
              extracted = {
                amount: parsed.amount,
                category: parsed.category || 'General',
                description: parsed.description || 'Quick Log',
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE
              };
            }
          } catch (e) {
            console.warn('Failed to parse RabbAi extracted transaction JSON (refusal or malformed):', e);
          }
        }

        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: cleanText || rawContent,
          timestamp: new Date().toISOString(),
          extractedTransaction: extracted
        };
      }
    }
  } catch (err) {
    console.warn('RabbAi text call failed:', err);
  }

  // Neutral Fallback Message (Protects Chat State & Prevents App Freezing)
  return {
    id: `msg_${Date.now()}`,
    sender: 'rabbai',
    text: "I couldn't process that phrasing cleanly. Let's stick to tracking normal expenses, income, or receipt scans!",
    timestamp: new Date().toISOString()
  };
}

/**
 * Send image (receipt/bill photo) to RabbAi using Groq Vision (llama-3.2-11b-vision-preview).
 * Performs OCR and outputs structured transaction for 1-click logging with bulletproof safety fallback.
 */
export async function sendRabbAiImageMessage(
  base64Image: string,
  userPromptText: string,
  data: AppData
): Promise<RabbAiMessage> {
  const apiKey = data.settings.groqApiKey || DEFAULT_GROQ_KEY;
  const categories = (data.categories || []).map(c => c.name).join(', ');

  const systemPrompt = `You are RabbAi, an expert OCR receipt & document analyzer.
Inspect the receipt/image provided. Perform text recognition and extraction.
Available Categories: ${categories}.

Return a JSON object inside \`\`\`json\`\`\` codeblock with:
{
  "merchant": string,
  "amount": number,
  "category": string,
  "summary": string
}
Write a brief friendly 1-2 sentence description of the scanned receipt items above the JSON block.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPromptText || 'Please OCR scan this receipt and extract total cost and merchant.' },
              {
                type: 'image_url',
                image_url: {
                  url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      })
    });

    if (response.ok) {
      let resJson: any = null;
      try {
        resJson = await response.json();
      } catch (e) {
        console.warn('Groq Vision response was not valid JSON:', e);
      }

      if (resJson) {
        const rawContent = resJson.choices?.[0]?.message?.content || 'Receipt OCR completed.';

        let extracted: RabbAiMessage['extractedTransaction'] = undefined;
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        let cleanText = rawContent.replace(/```json\s*([\s\S]*?)\s*```/g, '').trim();

        if (jsonMatch && jsonMatch[1]) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            if (typeof parsed.amount === 'number' && parsed.amount > 0) {
              extracted = {
                amount: parsed.amount,
                category: parsed.category || 'Food & Dining',
                description: parsed.merchant ? `${parsed.merchant} (Receipt OCR)` : 'Receipt Scan',
                type: TransactionType.EXPENSE
              };
            }
          } catch (e) {
            console.warn('Failed to parse vision OCR transaction JSON:', e);
          }
        }

        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: cleanText || 'Scanned receipt details extracted below:',
          timestamp: new Date().toISOString(),
          extractedTransaction: extracted
        };
      }
    }
  } catch (err) {
    console.warn('RabbAi vision OCR call failed:', err);
  }

  // Fallback response if vision model is busy, offline, or returns safety refusal
  return {
    id: `msg_${Date.now()}`,
    sender: 'rabbai',
    text: "I couldn't scan that receipt image cleanly. Please try a clearer photo or log the expense manually.",
    timestamp: new Date().toISOString()
  };
}
