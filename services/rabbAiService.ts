import { AppData, TransactionType } from '../types';

export type RabbAiAction =
  | { type: 'ADD_WALLET'; payload: { name: string; currency: string }; executed?: boolean }
  | { type: 'DELETE_WALLET'; payload: { name: string }; executed?: boolean }
  | { type: 'ADD_CATEGORY'; payload: { name: string; categoryType: string }; executed?: boolean }
  | { type: 'DELETE_CATEGORY'; payload: { name: string }; executed?: boolean }
  | { type: 'MERGE_CATEGORY'; payload: { from: string; into: string }; executed?: boolean }
  | { type: 'EXPORT_CSV'; payload: Record<string, never>; executed?: boolean }
  | { type: 'DELETE_ALL_DATA'; payload: { userName?: string }; executed?: boolean };

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
    loggedTransactionId?: string;
  };
  aiAction?: RabbAiAction;
}

export interface RabbAiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: RabbAiMessage[];
}

const STORAGE_KEY = 'trackxpense_rabbai_conversations';
// Always use the server-side env key — never expose or read user-stored keys
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

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
    title: 'Assistant',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: 'I can log expenses, scan receipts, and answer questions about your balance. What do you need?',
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
  const apiKey = GROQ_API_KEY;

  const income = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const categories = (data.categories || []).map(c => c.name).join(', ');
  const wallets = (data.wallets || []).map(w => w.name).join(', ');
  const curr = data.settings.currencySymbol || '$';

  const systemPrompt = `You are RabbAi, a highly intelligent, minimalist, and precise financial assistant in TrackXpense.
Be concise, direct, and factual. Do not use emojis, do not overexplain, and avoid unnecessary conversational filler.

Financial Context:
- User: ${data.profile?.name || 'User'}
- Balance: ${curr}${balance.toFixed(2)} | Inflows: ${curr}${income.toFixed(2)} | Outflows: ${curr}${expense.toFixed(2)}
- Wallets: ${wallets}
- Existing Categories: ${categories}

## Semantic Categorization & Taxonomy Rules:
- "description": The specific item, service, or merchant (e.g., "Toy Glock", "RTX 4090", "Uber ride", "Netflix", "Guitar lessons").
- "category": Must ALWAYS be a broad, high-level spending domain (e.g., "Hobbies", "Electronics", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Health & Fitness", "Education", "Utilities", "Travel", "Personal").
- CRITICAL: NEVER put the item or product name (e.g. "Toy Glock", "Glock", "Pizza") as the category name!
- Category Selection:
  1. Check existing categories: [${categories}]. If a suitable domain exists, use it.
  2. If no existing category fits the domain, pick the canonical standard domain (e.g. "Hobbies", "Electronics", "Fitness", "Education"). The system will automatically create it.

## Permitted Actions (Return JSON block when requested):

1. Log a transaction ("Spent 45 on toy glock", "Earned 200 freelance"):
\`\`\`json
{ "action": "ADD_TRANSACTION", "amount": 45, "category": "Hobbies", "description": "Toy Glock", "type": "EXPENSE" }
\`\`\`

2. Add a wallet:
\`\`\`json
{ "action": "ADD_WALLET", "name": "Savings", "currency": "$" }
\`\`\`

3. Delete a wallet:
\`\`\`json
{ "action": "DELETE_WALLET", "name": "Savings" }
\`\`\`

4. Add a category:
\`\`\`json
{ "action": "ADD_CATEGORY", "name": "Hobbies", "categoryType": "EXPENSE" }
\`\`\`

5. Delete a category:
\`\`\`json
{ "action": "DELETE_CATEGORY", "name": "Fitness" }
\`\`\`

6. Merge categories:
\`\`\`json
{ "action": "MERGE_CATEGORY", "from": "OldCat", "into": "NewCat" }
\`\`\`

7. Export CSV:
\`\`\`json
{ "action": "EXPORT_CSV" }
\`\`\`

8. Delete all site data:
\`\`\`json
{ "action": "DELETE_ALL_DATA" }
\`\`\`

## Navigation Guidance:
Keep it to 1 sentence pointing to the screen:
- Identity / Budgets → Sidebar → Identity Control
- Subscriptions → Menu → Subscriptions
- Upcoming Bills → Menu → Upcoming Expenses
- Debts → Debts tab in bottom nav

Keep all responses under 2-3 concise sentences. Never use emojis.`;


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

        let extracted: RabbAiMessage['extractedTransaction'] = undefined;
        let aiAction: RabbAiMessage['aiAction'] = undefined;

        // Primary: match fenced ```json ... ``` block
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        // Secondary: match a bare { ... } JSON object not inside a code fence
        const bareJsonMatch = !jsonMatch && rawContent.match(/\{[\s\S]*?"action"[\s\S]*?\}/);

        let cleanText = rawContent
          .replace(/```json\s*[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?"action"[\s\S]*?\}/g, '')
          .trim();

        const jsonSource = jsonMatch?.[1] ?? (bareJsonMatch ? bareJsonMatch[0] : null);

        if (jsonSource) {
          try {
            const parsed = JSON.parse(jsonSource);
            const act = parsed.action;

            if (act === 'ADD_TRANSACTION' && typeof parsed.amount === 'number' && parsed.amount > 0) {
              extracted = {
                amount: parsed.amount,
                category: parsed.category || 'General',
                description: parsed.description || 'Quick Log',
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE
              };
            } else if (act === 'ADD_WALLET' && parsed.name) {
              aiAction = { type: 'ADD_WALLET', payload: { name: parsed.name, currency: parsed.currency || '$' } };
            } else if (act === 'DELETE_WALLET' && parsed.name) {
              aiAction = { type: 'DELETE_WALLET', payload: { name: parsed.name } };
            } else if (act === 'ADD_CATEGORY' && parsed.name) {
              aiAction = { type: 'ADD_CATEGORY', payload: { name: parsed.name, categoryType: parsed.categoryType || 'EXPENSE' } };
            } else if (act === 'DELETE_CATEGORY' && parsed.name) {
              aiAction = { type: 'DELETE_CATEGORY', payload: { name: parsed.name } };
            } else if (act === 'MERGE_CATEGORY' && parsed.from && parsed.into) {
              aiAction = { type: 'MERGE_CATEGORY', payload: { from: parsed.from, into: parsed.into } };
            } else if (act === 'EXPORT_CSV') {
              aiAction = { type: 'EXPORT_CSV', payload: {} };
            } else if (act === 'DELETE_ALL_DATA') {
              aiAction = { type: 'DELETE_ALL_DATA', payload: { userName: data.profile?.name || 'User' } };
            } else if (!act && typeof parsed.amount === 'number' && parsed.amount > 0) {
              // Legacy format without action field
              extracted = {
                amount: parsed.amount,
                category: parsed.category || 'General',
                description: parsed.description || 'Quick Log',
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE
              };
            }
          } catch (e) {
            console.warn('Failed to parse RabbAi action JSON:', e);
          }
        }

        // When an action card is present, show a neutral fallback if the model left no prose.
        // Never fall back to rawContent — that would leak the JSON block into the chat bubble.
        const hasAction = !!(extracted || aiAction);
        const displayText = cleanText || (hasAction ? 'Got it! Review the action below.' : 'I processed your request.');

        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: displayText,
          timestamp: new Date().toISOString(),
          extractedTransaction: extracted,
          aiAction
        };
      }
    }
  } catch (err) {
    console.warn('RabbAi text call failed:', err);
  }

  return {
    id: `msg_${Date.now()}`,
    sender: 'rabbai',
    text: "I couldn't process that request. Try again or log expenses manually!",
    timestamp: new Date().toISOString()
  };
}

/**
 * Send image (receipt/screenshot/bill photo) to RabbAi using Groq Vision (qwen/qwen3.6-27b).
 * Performs OCR and outputs structured transaction for 1-click logging with bulletproof safety fallback.
 */
export async function sendRabbAiImageMessage(
  base64Image: string,
  userPromptText: string,
  data: AppData
): Promise<RabbAiMessage> {
  const apiKey = GROQ_API_KEY;
  const categories = (data.categories || []).map(c => c.name).join(', ');
  const curr = data.settings.currencySymbol || '$';

  const systemPrompt = `You are RabbAi, an expert OCR analyzer for receipts, bills, invoices, banking screenshots, and product photos.
Analyze the image carefully. Read all text, numbers, transaction amounts, and identify the merchant, item, or object.
Existing Categories: [${categories}].

## Semantic Categorization & Taxonomy Rules:
- "merchant": The specific product, service, store, or object identified in the image (e.g. "Toy Glock", "Whole Foods", "RTX 4090", "Starbucks", "Nike Shoes").
- "category": Must ALWAYS be a broad, high-level spending domain (e.g., "Hobbies", "Electronics", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Health & Fitness", "Education", "Utilities", "Travel", "Personal").
- CRITICAL: NEVER put the item or product name (e.g. "Toy Glock", "Shoes", "Burger") as the category name!
- Categorization steps:
  1. Check if any existing category fits the domain: [${categories}].
  2. If none fits (e.g. a Toy Glock with no "Hobbies" or "Entertainment" category), choose the canonical standard category name (e.g. "Hobbies", "Electronics", "Fitness"). The system will automatically create it.

Return a JSON object inside a \`\`\`json\`\`\` codeblock with:
{
  "merchant": "Vendor / Item / Merchant Name",
  "amount": 25.00,
  "category": "Hobbies",
  "type": "EXPENSE",
  "summary": "Brief 1-sentence summary"
}

Provide a concise 1-sentence explanation above the JSON block. Do not overexplain.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPromptText || 'Please scan this receipt or screenshot, extract the merchant name, total amount, and category.' },
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
        let rawContent = resJson.choices?.[0]?.message?.content || 'Image analysis completed.';
        // Strip out reasoning / <think> tags from Qwen models
        rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        let extracted: RabbAiMessage['extractedTransaction'] = undefined;
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        const bareJsonMatch = !jsonMatch && rawContent.match(/\{[\s\S]*?"amount"[\s\S]*?\}/);

        let cleanText = rawContent
          .replace(/```json\s*[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*?"amount"[\s\S]*?\}/g, '')
          .trim();

        const jsonSource = jsonMatch?.[1] ?? (bareJsonMatch ? bareJsonMatch[0] : null);

        if (jsonSource) {
          try {
            const parsed = JSON.parse(jsonSource);
            if (typeof parsed.amount === 'number' && parsed.amount > 0) {
              extracted = {
                amount: parsed.amount,
                category: parsed.category || 'General',
                description: parsed.merchant ? `${parsed.merchant}` : 'Receipt/Screenshot Log',
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE
              };
            }
          } catch (e) {
            console.warn('Failed to parse vision OCR transaction JSON:', e);
          }
        }

        const displayText = cleanText || (extracted ? `Extracted ${curr}${extracted.amount} for ${extracted.description}.` : 'Image scan complete.');

        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: displayText,
          timestamp: new Date().toISOString(),
          extractedTransaction: extracted
        };
      }
    } else {
      const errText = await response.text();
      console.warn('Groq vision API error:', response.status, errText);
    }
  } catch (err) {
    console.warn('RabbAi vision OCR call failed:', err);
  }

  // Fallback response if vision model is busy, offline, or returns safety refusal
  return {
    id: `msg_${Date.now()}`,
    sender: 'rabbai',
    text: "I couldn't scan that image cleanly. Please try a clearer screenshot or log the expense manually.",
    timestamp: new Date().toISOString()
  };
}
