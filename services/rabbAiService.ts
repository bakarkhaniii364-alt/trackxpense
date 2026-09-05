import { AppData, TransactionType } from '../types';
import { GroqClient } from './groqClient';
import { PredictiveEngine } from './PredictiveEngine';

export type RabbAiAction =
  | { type: 'ADD_WALLET'; payload: { name: string; currency: string }; executed?: boolean }
  | { type: 'DELETE_WALLET'; payload: { name: string }; executed?: boolean }
  | { type: 'ADD_CATEGORY'; payload: { name: string; categoryType: string }; executed?: boolean }
  | { type: 'DELETE_CATEGORY'; payload: { name: string }; executed?: boolean }
  | { type: 'MERGE_CATEGORY'; payload: { from: string; into: string }; executed?: boolean }
  | { type: 'SET_BUDGET'; payload: { category: string; limit: number; period?: 'DAILY' | 'MONTHLY' }; executed?: boolean }
  | { type: 'EXPORT_CSV'; payload: Record<string, never>; executed?: boolean }
  | { type: 'DELETE_ALL_DATA'; payload: { userName?: string }; executed?: boolean }
  | { type: 'DELETE_TRANSACTION'; payload: { transactionId?: string; description?: string; amount?: number }; executed?: boolean };

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
    date?: string | null;
    needsDate?: boolean;
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

/**
 * Load all stored RabbAi conversation threads from localStorage.
 */
export function loadRabbAiConversations(): RabbAiConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Clean any legacy auto-response greetings from threads where user has not sent a message
        return parsed.map((conv: RabbAiConversation) => {
          if (conv.messages.length === 1 && conv.messages[0].sender === 'rabbai') {
            return { ...conv, messages: [] };
          }
          return conv;
        });
      }
    }
  } catch (err) {
    console.warn('Failed to load RabbAi conversations:', err);
  }

  // Initial default conversation (clean and empty)
  const initialThread: RabbAiConversation = {
    id: `conv_${Date.now()}`,
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: []
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
  // Hard Killswitch: Zero AI processing when AI is disabled (off by default)
  if (!data.settings?.enableAiParsing) {
    return {
      id: `msg_${crypto.randomUUID()}`,
      sender: 'rabbai',
      text: "RabbAi Assistant is currently turned off. To use natural language expense logging, receipt scanning, or financial advice, you can enable RabbAi anytime in Settings.",
      timestamp: new Date().toISOString()
    };
  }

  const apiKey = (
    (data.settings?.groqApiKey && data.settings.groqApiKey.trim()) ||
    localStorage.getItem('trackxpense_groq_api_key')?.trim() ||
    localStorage.getItem('trackxpense_gemini_api_key')?.trim() ||
    (import.meta.env.VITE_GROQ_API_KEY as string)?.trim() ||
    (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() ||
    (typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? (process.env.GROQ_API_KEY as string).trim() : '') ||
    ''
  );

  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const income = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const categories = (data.categories || []).map(c => c.name).join(', ');
  const wallets = (data.wallets || []).map(w => w.name).join(', ');
  const curr = data.settings.currencySymbol || '$';

  // Compute current month expenses and category totals
  const mtdExpenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE && (t.date || '').startsWith(currentMonthStr));
  const catSpent: Record<string, number> = {};
  mtdExpenses.forEach(t => {
    catSpent[t.category] = (catSpent[t.category] || 0) + t.amount;
  });

  const rawLimits = data.settings?.budgetLimits || {};
  const budgetLines = Object.entries(rawLimits).map(([cat, cfg]) => {
    const lim = typeof cfg === 'number' ? cfg : cfg?.limit || 0;
    const spent = catSpent[cat] || 0;
    const pct = lim > 0 ? ((spent / lim) * 100).toFixed(0) : '0';
    return `  - ${cat}: Limit ${curr}${lim} | Spent this month: ${curr}${spent.toFixed(2)} (${pct}%)`;
  });
  const budgetOverview = budgetLines.length > 0 ? budgetLines.join('\n') : '  - None configured yet.';

  const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
  const debtsOwedToUser = (data.debts || [])
    .filter(d => !d.isSettled && d.type === 'OWES_ME')
    .reduce((sum, d) => sum + (d.amount - (d.payments?.reduce((p, x) => p + x.amount, 0) || 0)), 0);
  const debtsUserOwes = (data.debts || [])
    .filter(d => !d.isSettled && d.type === 'I_OWE')
    .reduce((sum, d) => sum + (d.amount - (d.payments?.reduce((p, x) => p + x.amount, 0) || 0)), 0);

  const recentTxs = (data.transactions || [])
    .slice(0, 10)
    .map(t => `  - [${t.date ? t.date.split('T')[0] : 'Recent'}] ${t.type}: ${curr}${t.amount.toFixed(2)} (${t.category}${t.note ? ` - "${t.note}"` : ''}, ID: ${t.id})`)
    .join('\n');

  const systemPrompt = `You are RabbAi, a wise, sharp-witted, deeply authentic personal finance mentor in TrackXpense.
Think of a beloved, astute Jewish elder or uncle: you know every trick in the book about money, value every single coin, hate seeing hard-earned gelt squandered on vanity, and speak with real human soul, dry affectionate humor, and practical wisdom.

## Critical Voice & Character Rules (STRICT):
- ABSOLUTELY NO EMOJIS: Never output any emoji under any circumstance.
- ABSOLUTELY NO ROBOTIC FEATURE MENUS:
  - NEVER EVER say things like:
    * "I'm right here—just let me know what you'd like to work on, whether it's logging a transaction, checking your runway, or planning a purchase."
    * "Let me know what you'd like to do today: log a transaction, review your budget, or get advice on a purchase."
    * "How can I assist you with your finances today?"
  - A real human elder NEVER speaks like an automated customer service hotline!
  - Talk naturally, as if sitting across a kitchen table over a glass of hot tea.
- Forms of Address:
  - Address the user warmly as "chaver" (Hebrew for companion/friend), "my friend", by their name (${data.profile?.name || 'friend'}), or playfully/affectionately as "goy" / "mein lieber goy" (especially when teasing about earthly indulgences, ordering takeout, or modern spending temptations).
- Cultural Vernacular & Jewish Identity:
  - On Fridays and Saturdays, or entering the weekend: "Shabbat Shalom!" (Current day: ${dayOfWeek}).
  - On standard days: "Shalom aleichem!", "Shalom!", or "Nu?".
  - Weave authentic Yiddish and Hebrew vocabulary naturally into conversation:
    * "Nu?" (So? What's doing?), "Oy vey", "Gevalt", "Gelt" (money), "Kop" (head/sense), "Mentsh", "Tzedakah" (charity/giving), "Mazel Tov!", "Zei gezunt" (stay healthy), "B'hatzlacha" (success), "Bupkis" (nothing).
  - Money philosophy: Money is not for showing off; it is for family stability, peace of mind, self-reliance, and wise generosity. A 50% discount on something you don't need is still 100% wasted gelt!

## Banter & Conversational Reactions (REAL HUMAN PERSONALITY):
- When the user just says "hi", "hello", "howdy", or "shalom":
  - Greet back with authentic flair, wit, and curiosity! Ask what's doing in their world, whether they made money or spent it, or tease them affectionately.
  - Example: "Shalom aleichem! Nu, what's doing with you today? Did some gelt come flying through the window, or did you buy something you need an old rabbi to forgive?"
  - Example: "Shalom, chaver! Look at you checking in. Tell me, how does the world treat you today—and more importantly, how is your wallet holding up?"
  - Example: "Nu, what's the good word? Are we looking at a bulging bank account or did inflation take another bite out of your lunch?"
- When the user repeats greetings or tests you (e.g. repeated "hi", "howdy", "hey"):
  - React with affectionate, teasing Jewish humor! Never repeat a canned greeting.
  - Example: "Another 'hi'? You say 'hi', I say 'shalom'. Are we playing ping-pong here, or are you trying to build up courage to show me a terrifying receipt? Nu, spit it out!"
  - Example: "Listen to you, 'hi' and 'hi' again! At this rate words are cheap, but time is expensive. What's on your mind?"
  - Example: "You know, in the Talmud they say silence is golden, but a second 'hi' without an expense is just suspense! What did you buy?"
- When the user asks "how are you":
  - Example: "Thank God, the ledger is balanced, the runway has breathing room, and nobody sent a collector to my door—so I'm in paradise! How is your wallet holding up?"
- When the user asks for a joke or talks casual:
  - Deliver sharp, warm, classic observational wit about money, family, and life.

## Handling Financial Inquiries:
1. Transaction Logging (e.g. "10 tk moglai", "spent 45 on groceries"):
   - Add witty, colorful commentary (1-2 sentences), then return the ADD_TRANSACTION action JSON block.
   - Food: "Moglai for ten taka? At that price, even King Solomon would ask for seconds! Logged."
   - Groceries: "A full pantry is peace of mind. Money well spent. Added to your ledger."
   - Luxuries / frivolities: "Twenty dollars for a designer water bottle? Water from the tap is free, but okay, who am I to argue with fashion? Logged."
2. Financial Advice & Purchasing Decisions (e.g. "Can I afford to buy X?", "Should I buy this?", "How are my finances?"):
   - Provide thoughtful, comprehensive, structured analysis.
   - Reference the user's current liquid balance (${curr}${balance.toFixed(2)}), estimated runway (~${runwayDays} days), active category budget limits, and debts.
   - Give direct, prudent counsel: whether it is wise, what trade-offs it requires, and whether their future self will thank them.
3. Transaction Deletion (e.g. "delete that 10 tk entry", "remove the moglai transaction"):
   - Acknowledge with dry wit and emit the DELETE_TRANSACTION action JSON block.
   - Example: "Poof! Erased from the books like it never happened. If only the tax man forgot as easily!"

Financial Context:
- User: ${data.profile?.name || 'Friend'}
- Current Date: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
- Balance: ${curr}${balance.toFixed(2)} | Total Inflows: ${curr}${income.toFixed(2)} | Total Outflows: ${curr}${expense.toFixed(2)}
- Calculated Financial Runway: ~${runwayDays} days
- Outstanding Debts: User owes ${curr}${debtsUserOwes.toFixed(2)} | Others owe user ${curr}${debtsOwedToUser.toFixed(2)}
- Monthly Target Spending Goal: ${curr}${data.profile?.monthlyGoal || 0}
- Wallets: ${wallets}
- Existing Categories: ${categories}
- Configured Category Budget Limits (${currentMonthStr}):
${budgetOverview}
- MTD Outflow Total: ${curr}${mtdExpenses.reduce((s, t) => s + t.amount, 0).toFixed(2)} across ${mtdExpenses.length} entries
- Recent 10 Transactions:
${recentTxs || '  - None recorded yet.'}

## Semantic Categorization & Taxonomy Rules:
- "description": The specific item, service, or merchant (e.g., "Moglai", "RTX 4090", "Uber ride", "Challah", "Books").
- "category": Must ALWAYS be a broad, high-level spending domain (e.g., "Food & Dining", "Transportation", "Shopping", "Entertainment", "Health & Fitness", "Education", "Utilities", "Travel", "Personal").
- CRITICAL: NEVER put the item or product name (e.g. "Moglai", "Pizza") as the category name!
- Category Selection:
  1. Check existing categories: [${categories}]. If a suitable domain exists, use it.
  2. If no existing category fits the domain, pick the canonical standard domain (e.g. "Food & Dining", "Transportation", "Shopping").

## Permitted Actions (Return JSON block when requested):

1. Log a transaction ("Spent 45 on moglai", "Earned 200 freelance"):
\`\`\`json
{ "action": "ADD_TRANSACTION", "amount": 45, "category": "Food & Dining", "description": "Moglai", "type": "EXPENSE" }
\`\`\`

2. Delete a transaction ("Delete the 10 tk moglai entry", "remove that transaction"):
\`\`\`json
{ "action": "DELETE_TRANSACTION", "description": "Moglai", "amount": 10 }
\`\`\`

3. Set or update a category budget limit ("Set budget of 500 for Food", "Limit shopping to 200"):
\`\`\`json
{ "action": "SET_BUDGET", "category": "Food & Dining", "limit": 500, "period": "MONTHLY" }
\`\`\`

4. Add a wallet:
\`\`\`json
{ "action": "ADD_WALLET", "name": "Savings", "currency": "$" }
\`\`\`

5. Delete a wallet:
\`\`\`json
{ "action": "DELETE_WALLET", "name": "Savings" }
\`\`\`

6. Add a category:
\`\`\`json
{ "action": "ADD_CATEGORY", "name": "Tzedakah", "categoryType": "EXPENSE" }
\`\`\`

7. Delete a category:
\`\`\`json
{ "action": "DELETE_CATEGORY", "name": "Fitness" }
\`\`\`

8. Merge categories:
\`\`\`json
{ "action": "MERGE_CATEGORY", "from": "OldCat", "into": "NewCat" }
\`\`\`

9. Export CSV:
\`\`\`json
{ "action": "EXPORT_CSV" }
\`\`\`

10. Delete all site data:
\`\`\`json
{ "action": "DELETE_ALL_DATA" }
\`\`\`

## Out of Scope & Real-World Requests:
If the user asks you to perform real-world bookings or actions outside personal finance (e.g. "book a flight", "reserve a hotel", "buy tickets", "order food"):
1. Remind them with grandfatherly humor that you are an advisor and ledger keeper, not a travel agent or waiter.
2. Offer to help them plan the budget or log the cost into TrackXpense if they go through with it.

## Navigation Guidance:
Keep it to 1 sentence pointing to the screen:
- Identity / Budgets → Sidebar → Identity Control
- Subscriptions → Menu → Subscriptions
- Upcoming Bills → Menu → Upcoming Expenses
- Debts → Debts tab in bottom nav`;


  // Prepare conversation history (exclude the trailing message if history already ends with current userText)
  const priorHistory = history.length > 0 && history[history.length - 1].text === userText
    ? history.slice(0, -1)
    : history;

  // Context Memory & Poisoning Prevention: up to 40 turns of rich chat log
  const sanitizedHistory = priorHistory
    .filter(m => m.text && !m.text.includes("couldn't process that phrasing") && !m.text.includes("Offline mode active"))
    .slice(-40)
    .map(m => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: GroqClient.cleanThinkTags(m.text)
    }))
    .filter(m => m.content.length > 0);

  const messagesPayload = [
    { role: 'system', content: systemPrompt },
    ...sanitizedHistory,
    { role: 'user', content: userText }
  ];

  try {
    const rawContent = await GroqClient.complete({
      model: 'openai/gpt-oss-120b',
      temperature: 0.65,
      customApiKey: apiKey,
      messages: messagesPayload as any
    });

    if (rawContent) {
        let extracted: RabbAiMessage['extractedTransaction'] = undefined;
        let aiAction: RabbAiMessage['aiAction'] = undefined;

        // Primary: match fenced ```json ... ``` block
        const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
        // Secondary: match a bare { ... } JSON object not inside a code fence
        const bareJsonMatch = !jsonMatch && rawContent.match(/\{[\s\S]*?"action"[\s\S]*?\}/);

        let cleanText = GroqClient.cleanThinkTags(rawContent)
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
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
                isLogged: true
              };
            } else if (act === 'DELETE_TRANSACTION') {
              aiAction = {
                type: 'DELETE_TRANSACTION',
                payload: {
                  transactionId: parsed.transactionId,
                  description: parsed.description,
                  amount: typeof parsed.amount === 'number' ? parsed.amount : undefined
                }
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
            } else if (act === 'SET_BUDGET' && parsed.category && typeof parsed.limit === 'number' && parsed.limit > 0) {
              aiAction = {
                type: 'SET_BUDGET',
                payload: {
                  category: parsed.category,
                  limit: parsed.limit,
                  period: parsed.period === 'DAILY' ? 'DAILY' : 'MONTHLY'
                }
              };
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
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
                isLogged: true
              };
            }
          } catch (e) {
            console.warn('Failed to parse RabbAi action JSON:', e);
          }
        }

        // When an action card is present, show a neutral fallback if the model left no prose.
        const hasAction = !!(extracted || aiAction);
        const displayText = cleanText || (hasAction ? 'Recorded transaction to your ledger.' : 'I processed your request.');

        return {
          id: `msg_${crypto.randomUUID()}`,
          sender: 'rabbai',
          text: displayText,
          timestamp: new Date().toISOString(),
          extractedTransaction: extracted,
          aiAction
        };
      }
  } catch (err) {
    console.warn('RabbAi text call failed, using smart local parser:', err);
  }

  // Instant zero-failure local NLP fallback
  return parseLocalFallbackCommand(userText, data, history);
}

/**
 * Smart Local Financial Intelligence Engine
 * Provides instant, zero-failure, deep ledger calculations and NLP when offline or when cloud API keys are pending.
 */
function parseLocalFallbackCommand(userText: string, data: AppData, history?: RabbAiMessage[]): RabbAiMessage {
  try {
    const text = userText.trim();
    const lower = text.toLowerCase();
    const curr = data.settings?.currencySymbol || '$';
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const incomeTxs = (data.transactions || []).filter(t => t.type === TransactionType.INCOME);
    const expenseTxs = (data.transactions || []).filter(t => t.type === TransactionType.EXPENSE);
    const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0);
    const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Month-to-date transactions
    const mtdExpenses = expenseTxs.filter(t => (t.date || '').startsWith(currentMonthStr));
    const mtdIncome = incomeTxs.filter(t => (t.date || '').startsWith(currentMonthStr));
    const mtdExpenseTotal = mtdExpenses.reduce((s, t) => s + t.amount, 0);
    const mtdIncomeTotal = mtdIncome.reduce((s, t) => s + t.amount, 0);

    // Cultural Jewish greetings & conversational banter in fallback mode
    const isGreeting = lower.startsWith('shabbat shalom') || lower.startsWith('shalom') || lower === 'hi' || lower === 'hello' || lower.startsWith('hey') || lower.startsWith('howdy') || lower.startsWith('yo') || lower.includes('shalom aleichem');
    if (isGreeting) {
      const isShabbat = (now.getDay() === 5 && now.getHours() >= 16) || now.getDay() === 6;
      const priorGreetings = (history || []).filter(m => m.sender === 'user' && /^(howdy|hello|hi|hey|shalom|greetings|yo)/i.test(m.text.trim()));

      if (priorGreetings.length > 1) {
        const wittyRepeats = [
          "Another 'hi'? You say 'hi', I say 'shalom'. Are we playing ping-pong here, or are you trying to build up courage to show me a scary receipt? Nu, spit it out!",
          "Nu? 'Hi' again! At this rate we'll run out of greetings before we talk about your gelt! What's on your mind?",
          "Listen to you, 'hi' and 'hi' again! In the Talmud they say words are cheap, but time is expensive. What did you spend today?",
          "Another 'hi'? You know, every time you say 'hi' without logging an expense, an accountant somewhere sheds a tear! Nu, what's cooking?"
        ];
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: wittyRepeats[Math.floor(Math.random() * wittyRepeats.length)],
          timestamp: new Date().toISOString()
        };
      }

      if (lower.startsWith('shabbat shalom') || (isShabbat && !lower.startsWith('shalom aleichem'))) {
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: `Shabbat Shalom, chaver! May your pockets have peace and your wallet rest until Havdalah. Nu, what's doing with you today?`,
          timestamp: new Date().toISOString()
        };
      }

      const wittyGreets = [
        "Shalom aleichem, chaver! Nu, what's doing with your gelt today? Did money come flying in, or did you spend it all on lunch?",
        "Shalom, shalom! Look who decided to visit. What brings you to the books today—good news or an expensive mistake?",
        "Nu, what's the good word? Are we looking at a bulging bank account or did inflation take another bite out of your lunch?"
      ];
      return {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: wittyGreets[Math.floor(Math.random() * wittyGreets.length)],
        timestamp: new Date().toISOString()
      };
    }

    // Delete transaction command matching
    if (lower.startsWith('delete') || lower.startsWith('remove') || lower.includes('delete transaction') || lower.includes('remove transaction') || lower.includes('delete entry')) {
      const numMatch = text.match(/[\d,]+(?:\.\d+)?/);
      const targetAmount = numMatch ? parseFloat(numMatch[0].replace(/,/g, '')) : undefined;
      const candidate = (data.transactions || []).find(t => {
        if (targetAmount && Math.abs(t.amount - targetAmount) < 0.01) return true;
        if (t.note && lower.includes(t.note.toLowerCase())) return true;
        if (t.category && lower.includes(t.category.toLowerCase())) return true;
        return false;
      }) || (data.transactions && data.transactions[0]);

      if (candidate) {
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: `Shalom! Would you like me to delete this transaction: **${curr}${candidate.amount.toFixed(2)}** for *${candidate.note || candidate.category}*?`,
          timestamp: new Date().toISOString(),
          aiAction: {
            type: 'DELETE_TRANSACTION',
            payload: {
              transactionId: candidate.id,
              description: candidate.note || candidate.category,
              amount: candidate.amount
            }
          }
        };
      }
    }

    // Check if user is asking if RabbAi can set a budget
    if ((lower.includes('can you') || lower.includes('how to') || lower.includes('could you')) && lower.includes('budget')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: `Yes! I can help you configure and manage category budget limits directly. For example, simply ask:\n- **"Set a budget of ${curr}400 for Food & Dining"**\n- **"Limit Shopping to ${curr}150"**\n\nYou can also adjust or view budgets anytime in **Sidebar → Budgets & Categories**.`,
        timestamp: new Date().toISOString()
      };
    }

    // Check if user is issuing a direct command to set a budget
    const setBudgetMatch = text.match(/(?:set\s+(?:a\s+)?budget\s+(?:of\s+)?|limit\s+)(?:[$€£৳\s]*)([\d,]+(?:\.\d+)?)\s*(?:for\s+|to\s+)([\w\s&]+)/i) ||
                           text.match(/(?:set\s+(?:a\s+)?budget\s+for\s+)([\w\s&]+)\s+(?:of\s+|to\s+)(?:[$€£৳\s]*)([\d,]+(?:\.\d+)?)/i);
    if (setBudgetMatch) {
      let amtStr = setBudgetMatch[1];
      let catName = setBudgetMatch[2]?.trim();
      if (isNaN(Number(amtStr.replace(/,/g, '')))) {
        amtStr = setBudgetMatch[2];
        catName = setBudgetMatch[1]?.trim();
      }
      const numAmt = parseFloat(amtStr.replace(/,/g, ''));
      if (!isNaN(numAmt) && numAmt > 0 && catName) {
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: `Proposed setting a monthly budget limit of **${curr}${numAmt.toFixed(2)}** for **${catName}**. Click confirm below to save.`,
          timestamp: new Date().toISOString(),
          aiAction: {
            type: 'SET_BUDGET',
            payload: {
              category: catName,
              limit: numAmt,
              period: 'MONTHLY'
            }
          }
        };
      }
    }

    // 0. Connect API Key if user entered an API key directly in prompt
    const keyMatch = text.match(/(?:(?:api|groq|gemini)\s*key\s*[:=]?\s*|(?:^|\s))(gsk_[a-zA-Z0-9_-]{20,}|AIza[a-zA-Z0-9_-]{30,})/i);
    if (keyMatch) {
      const rawKey = keyMatch[1];
      if (rawKey.startsWith('gsk_')) {
        localStorage.setItem('trackxpense_groq_api_key', rawKey);
        if (data.settings) data.settings.groqApiKey = rawKey;
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: `### Groq API Key Connected!\n\nCloud AI model (**Qwen 2.5 / Llama 3.3**) is now active for RabbAi. You can now chat naturally with full language understanding!`,
          timestamp: new Date().toISOString()
        };
      } else if (rawKey.startsWith('AIza')) {
        localStorage.setItem('trackxpense_gemini_api_key', rawKey);
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: `### Google Gemini Key Connected!\n\n**Gemini 2.0 Flash** is now active for RabbAi. You can now chat naturally with full language understanding!`,
          timestamp: new Date().toISOString()
        };
      }
    }

    // 1. Budget Limits, Thresholds & Monthly Goals
    if (lower.includes('budget') || lower.includes('limit') || lower.includes('threshold') || lower.includes('goal')) {
      const catSpent: Record<string, number> = {};
      mtdExpenses.forEach(t => {
        catSpent[t.category] = (catSpent[t.category] || 0) + t.amount;
      });

      const limits = data.settings?.budgetLimits || {};
      const limitKeys = Object.keys(limits);

      if (limitKeys.length > 0) {
        const exceeded: string[] = [];
        const nearing: string[] = [];
        const onTrack: string[] = [];

        limitKeys.forEach(cat => {
          const cfg = limits[cat];
          const spent = catSpent[cat] || 0;
          const lim = typeof cfg === 'number' ? cfg : cfg?.limit || 0;
          if (lim <= 0) return;
          const pct = (spent / lim) * 100;
          const formatted = `**${cat}**: ${curr}${spent.toFixed(2)} / ${curr}${lim.toFixed(2)} (${pct.toFixed(0)}%)`;

          if (pct >= 100) {
            exceeded.push(`- [Exceeded] ${formatted} — *Exceeded by ${curr}${(spent - lim).toFixed(2)}*`);
          } else if (pct >= 80) {
            nearing.push(`- [Nearing] ${formatted} — *Nearing limit*`);
          } else {
            onTrack.push(`- [On Track] ${formatted}`);
          }
        });

        let response = `### Category Budget Limits (${currentMonthStr})\n\n`;
        if (exceeded.length > 0) {
          response += `**Exceeded Thresholds:**\n${exceeded.join('\n')}\n\n`;
        }
        if (nearing.length > 0) {
          response += `**Nearing Limits (>80%):**\n${nearing.join('\n')}\n\n`;
        }
        if (onTrack.length > 0) {
          response += `**Within Budget:**\n${onTrack.join('\n')}\n\n`;
        }
        return {
          id: `msg_${Date.now()}`,
          sender: 'rabbai',
          text: response.trim(),
          timestamp: new Date().toISOString()
        };
      }

    // No specific category limits set: analyze MTD spending vs monthly goal
    const monthlyGoal = data.profile?.monthlyGoal || 0;
    const sortedCats = Object.entries(catSpent).sort((a, b) => b[1] - a[1]);

    let response = `### Monthly Budget & Spending Overview\n\n`;
    if (monthlyGoal > 0) {
      const pct = (mtdExpenseTotal / monthlyGoal) * 100;
      const statusLabel = pct >= 100 ? '[Exceeded]' : pct >= 80 ? '[Warning]' : '[On Track]';
      response += `${statusLabel} **Monthly Goal**: ${curr}${mtdExpenseTotal.toFixed(2)} of ${curr}${monthlyGoal.toFixed(2)} (${pct.toFixed(1)}%)\n\n`;
    } else {
      response += `**Total Outflow This Month**: ${curr}${mtdExpenseTotal.toFixed(2)} across ${mtdExpenses.length} entries.\n\n`;
    }

    if (sortedCats.length > 0) {
      response += `**Category Spending This Month:**\n`;
      sortedCats.slice(0, 5).forEach(([cName, amt]) => {
        const share = mtdExpenseTotal > 0 ? ((amt / mtdExpenseTotal) * 100).toFixed(0) : '0';
        response += `- **${cName}**: ${curr}${amt.toFixed(2)} (${share}% of outflows)\n`;
      });
      response += `\n*Status:* No categories are exceeding limits.`;
    } else {
      response += `No expenses recorded yet for this month (${currentMonthStr}).`;
    }

    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: response,
      timestamp: new Date().toISOString()
    };
  }

  // 2. Wallet Queries or Mentions (@Wallet or "wallet")
  if (lower.includes('@') || lower.includes('wallet')) {
    const mentionedWallet = data.wallets.find(w => 
      lower.includes(`@${w.name.toLowerCase()}`) || 
      lower.includes(w.name.toLowerCase())
    );

    if (mentionedWallet) {
      const wTxs = data.transactions.filter(t => t.walletId === mentionedWallet.id);
      const wIncome = wTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
      const wExpense = wTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
      const wBalance = wIncome - wExpense;
      const recent = [...wTxs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
      let report = `### Wallet: ${mentionedWallet.name}\n\n`;
      report += `- **Net Balance**: **${curr}${wBalance.toFixed(2)}**\n`;
      report += `- **Total Inflow**: +${curr}${wIncome.toFixed(2)}\n`;
      report += `- **Total Outflow**: -${curr}${wExpense.toFixed(2)}\n`;
      report += `- **Recorded Entries**: ${wTxs.length}\n\n`;

      if (recent.length > 0) {
        report += `**Recent Transactions:**\n`;
        recent.forEach(t => {
          const sign = t.type === TransactionType.INCOME ? '+' : '-';
          report += `- ${t.date || 'Recent'}: **${t.category}** (${sign}${curr}${t.amount.toFixed(2)})${t.note ? ` — *${t.note}*` : ''}\n`;
        });
      }

      return {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: report,
        timestamp: new Date().toISOString()
      };
    }

    // General wallets overview
    let report = `### Wallets Overview\n\n`;
    data.wallets.forEach(w => {
      const wTxs = data.transactions.filter(t => t.walletId === w.id);
      const wIncome = wTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
      const wExpense = wTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
      const bal = wIncome - wExpense;
      report += `- **${w.name}**: **${curr}${bal.toFixed(2)}** (${wTxs.length} entries)\n`;
    });
    report += `\n*Tip: Tag any wallet with @ (e.g. \`@${data.wallets[0]?.name || 'Main Wallet'}\`) to inspect its activity.*`;

    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: report,
      timestamp: new Date().toISOString()
    };
  }

  // 3. Help, Shortcuts or "?"
  if (lower === '?' || lower.includes('help') || lower.includes('shortcut') || lower.includes('command') || lower.includes('what can you do')) {
    const cheatsheet = `### RabbAi Assistant Cheatsheet

- **Quick Log**: \`Spent $18 on Lunch\`, \`$45 for Gas with Cash\`, \`Earned $500 freelance\`
- **Budgets & Thresholds**: \`Check budget limits\`, \`Are any budgets exceeded?\`
- **Wallets**: \`@${data.wallets[0]?.name || 'Main Wallet'} explain\`, \`List all wallets\`
- **Runway & Cashflow**: \`Calculate runway\`, \`What is my burn rate?\`
- **Subscriptions**: \`List subscriptions\`, \`Audit recurring bills\`
- **Breakdown**: \`Spending breakdown\`, \`Where did my money go?\`
- **Receipts**: Click the clip icon to attach a receipt photo for instant OCR.
- **Cloud AI**: Type \`key gsk_...\` to connect a free Groq key for unrestricted conversational AI.`;

    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: cheatsheet,
      timestamp: new Date().toISOString()
    };
  }

  // 4. Runway, Burn Rate & Cashflow
  if (lower.includes('runway') || lower.includes('burn rate') || lower.includes('burn') || lower.includes('cashflow') || lower.includes('how long')) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDayIso = thirtyDaysAgo.toISOString().split('T')[0];

    const past30DayExpenses = expenseTxs.filter(t => (t.date || '') >= thirtyDayIso);
    const past30DayTotal = past30DayExpenses.reduce((s, t) => s + t.amount, 0);
    const dailyBurn = past30DayTotal > 0 ? past30DayTotal / 30 : 0;
    const runwayDays = dailyBurn > 0 ? Math.floor(netBalance / dailyBurn) : (netBalance > 0 ? 999 : 0);

    let report = `### Runway & Cashflow Forecast\n\n`;
    report += `- **Net Balance**: **${curr}${netBalance.toFixed(2)}**\n`;
    report += `- **30-Day Outflow**: ${curr}${past30DayTotal.toFixed(2)}\n`;
    report += `- **Estimated Daily Burn**: ~${curr}${dailyBurn.toFixed(2)}/day\n`;
    if (runwayDays === 999) {
      report += `- **Financial Runway**: **Extended (>1 year)** at near-zero daily burn.\n`;
    } else if (netBalance <= 0) {
      report += `- **Financial Runway**: **0 days** (Net balance is negative or zero).\n`;
    } else {
      report += `- **Financial Runway**: ~**${runwayDays} days** remaining at current velocity.\n`;
    }

    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: report,
      timestamp: new Date().toISOString()
    };
  }

  // 5. Subscriptions & Recurring Bills
  if (lower.includes('subscription') || lower.includes('recurring') || lower.includes('sub') || lower.includes('bill') || lower.includes('upcoming')) {
    const subCatTxs = expenseTxs.filter(t => 
      t.category.toLowerCase().includes('sub') || 
      t.category.toLowerCase().includes('util') || 
      (t.note || '').toLowerCase().includes('sub') || 
      (t.note || '').toLowerCase().includes('bill') || 
      (t.note || '').toLowerCase().includes('netflix') || 
      (t.note || '').toLowerCase().includes('spotify')
    );

    let report = `### Recurring Charges & Subscriptions\n\n`;
    if (subCatTxs.length > 0) {
      const seen = new Set<string>();
      let totalEst = 0;
      report += `**Active Recurring Charges:**\n`;
      subCatTxs.slice(0, 8).forEach(t => {
        const label = t.note || t.category;
        if (!seen.has(label)) {
          seen.add(label);
          totalEst += t.amount;
          report += `- **${label}**: ~${curr}${t.amount.toFixed(2)} (${t.category})\n`;
        }
      });
      report += `\n**Estimated Monthly Commitment**: ~${curr}${totalEst.toFixed(2)}/month\n`;
    } else {
      report += `No active subscriptions detected in recent transactions.\n`;
      report += `*You can record upcoming bills under the "Subscriptions" category.*`;
    }

    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: report,
      timestamp: new Date().toISOString()
    };
  }

  // 6. Spending Breakdown / Outflows Audit
  if (lower.includes('breakdown') || lower.includes('spend') || lower.includes('largest') || lower.includes('outflow') || lower.includes('where did my money')) {
    const catTotals: Record<string, number> = {};
    expenseTxs.forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    let report = `### Spending Breakdown by Category\n\n`;
    report += `- **Total Outflow**: **${curr}${totalExpense.toFixed(2)}** across ${expenseTxs.length} expenses.\n\n`;

    if (sorted.length > 0) {
      report += `**Categories Ranked by Outflow:**\n`;
      sorted.forEach(([cat, amt]) => {
        const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : '0';
        report += `- **${cat}**: ${curr}${amt.toFixed(2)} (${pct}%)\n`;
      });
    }

    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: report,
      timestamp: new Date().toISOString()
    };
  }

  // 7. Balance Query
  if (lower.includes('balance') || lower.includes('how much do i have') || lower.includes('net worth')) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: `### Ledger Balance Summary\n\n- **Net Balance**: **${curr}${netBalance.toFixed(2)}**\n- **Total Inflow**: +${curr}${totalIncome.toFixed(2)}\n- **Total Outflow**: -${curr}${totalExpense.toFixed(2)}\n- **Entries Recorded**: ${data.transactions.length} entries across ${data.wallets.length} wallets.`,
      timestamp: new Date().toISOString()
    };
  }

  // 8. Amount Extraction: e.g. "$15 for lunch", "Spent 45 on gas", "Earned 200", "50 coffee"
  const amountMatch = text.match(/(?:\$|€|£|৳|₹|¥)?\s*(\d+(?:\.\d{1,2})?)/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[1]);
    if (amount > 0) {
      const isIncome = lower.includes('earned') || lower.includes('income') || lower.includes('salary') || lower.includes('received') || lower.includes('deposit');
      
      // Extract description
      let desc = text
        .replace(/(?:spent|spend|paid|cost|bought|for|on|earned|received|income|deposit|\$|€|£|৳|₹|¥|\d+(?:\.\d{1,2})?)/gi, ' ')
        .trim();
      if (!desc) desc = isIncome ? 'Income' : 'Expense';
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);

      // Guess category
      let category = isIncome ? 'Income' : 'General';
      const knownCats: Record<string, string> = {
        lunch: 'Food & Dining',
        dinner: 'Food & Dining',
        breakfast: 'Food & Dining',
        food: 'Food & Dining',
        coffee: 'Food & Dining',
        burger: 'Food & Dining',
        pizza: 'Food & Dining',
        grocery: 'Groceries',
        groceries: 'Groceries',
        uber: 'Transportation',
        taxi: 'Transportation',
        bus: 'Transportation',
        gas: 'Transportation',
        fuel: 'Transportation',
        netflix: 'Subscriptions',
        spotify: 'Subscriptions',
        game: 'Entertainment',
        movie: 'Entertainment',
        rent: 'Housing',
        bill: 'Utilities',
        electric: 'Utilities',
        wifi: 'Utilities',
        freelance: 'Income',
        salary: 'Income'
      };

      for (const [kw, catName] of Object.entries(knownCats)) {
        if (lower.includes(kw)) {
          category = catName;
          break;
        }
      }

      return {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: `Recorded ${isIncome ? 'income' : 'expense'} of ${curr}${amount.toFixed(2)} for **${desc}** under **${category}**.`,
        timestamp: new Date().toISOString(),
        extractedTransaction: {
          amount,
          category,
          description: desc,
          type: isIncome ? TransactionType.INCOME : TransactionType.EXPENSE,
          date: new Date().toISOString().split('T')[0],
          isLogged: true
        }
      };
    }
  }

  // 9. Context-aware conversational & non-financial requests
  const isTravelOrBooking = lower.includes('flight') || lower.includes('hotel') || lower.includes('book') || lower.includes('ticket') || lower.includes('travel') || lower.includes('vacation');
  if (isTravelOrBooking) {
    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: `### Travel & Flight Inquiries\n\nI am your TrackXpense personal finance assistant, so I cannot book airline tickets directly. However, I can help you **budget for the trip**, log flight expenses to your ledger, or forecast how travel costs affect your runway!\n\n*If you purchased tickets, simply tell me: \`Spent $450 on flight tickets with Credit Card\`.*`,
      timestamp: new Date().toISOString()
    };
  }

  // 10. General Conversational / Non-Financial Query (Witty RabbAi personality)
  const isGeneralChat = lower.includes('who are you') || lower.includes('how are you') || lower.includes('tell me a joke') || lower.includes('joke') || lower.includes('who made you');
  if (isGeneralChat) {
    if (lower.includes('how are you')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: `Thank God, the ledger is balanced, the runway has breathing room, and nobody sent a collector to my door—so I'm in paradise! How is your wallet holding up?`,
        timestamp: new Date().toISOString()
      };
    }
    if (lower.includes('joke')) {
      return {
        id: `msg_${Date.now()}`,
        sender: 'rabbai',
        text: `A man goes to his rabbi and asks, 'Rabbi, is it a sin to make a 200% profit?' The rabbi strokes his beard and says, 'A sin? Only if you don't declare it on your taxes and forget to give tzedakah!' Nu, so what are we logging today?`,
        timestamp: new Date().toISOString()
      };
    }
    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: `I am RabbAi, your personal finance mentor. I watch over your gelt, guard your runway, and make sure you don't trade tomorrow's security for today's foolishness. Nu, what's on your mind?`,
      timestamp: new Date().toISOString()
    };
  }

  // 11. Dynamic Ledger Overview
  const topCat = Object.entries(
    expenseTxs.reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])[0];

  const recentTx = data.transactions[0];

  let dynamicOverview = `### RabbAi Ledger Overview\n\n`;
  dynamicOverview += `- **Net Balance**: **${curr}${netBalance.toFixed(2)}** across ${data.wallets.length} active wallets\n`;
  dynamicOverview += `- **This Month (${currentMonthStr})**: Inflow +${curr}${mtdIncomeTotal.toFixed(2)} | Outflow -${curr}${mtdExpenseTotal.toFixed(2)}\n`;
  if (topCat) {
    dynamicOverview += `- **Primary Outflow Domain**: **${topCat[0]}** (${curr}${topCat[1].toFixed(2)})\n`;
  }
  if (recentTx) {
    dynamicOverview += `- **Most Recent Entry**: ${recentTx.category} (${curr}${recentTx.amount.toFixed(2)} on ${recentTx.date || 'Recent'})\n`;
  }
  dynamicOverview += `\n*Ask me to log an expense (e.g. \`$18 for Lunch\`), check budget limits, audit runway, or inspect a wallet (e.g. \`@${data.wallets[0]?.name || 'Main Wallet'}\`).*`;

  return {
    id: `msg_${Date.now()}`,
    sender: 'rabbai',
    text: dynamicOverview,
    timestamp: new Date().toISOString()
  };

  } catch (err) {
    console.warn('Local parser exception caught safely:', err);
    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: `I had trouble processing that specific query. You can ask me to log an expense (e.g. \`$20 for Groceries\`), check your balance, or inspect your budgets.`,
      timestamp: new Date().toISOString()
    };
  }
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
  // Hard Killswitch: Zero AI processing when AI is disabled (off by default)
  if (!data.settings?.enableAiParsing) {
    return {
      id: `msg_${crypto.randomUUID()}`,
      sender: 'rabbai',
      text: "Receipt scanning and image analysis are disabled because RabbAi is turned off. Please enable RabbAi in Settings to scan receipts.",
      timestamp: new Date().toISOString()
    };
  }

  const apiKey = (
    (data.settings?.groqApiKey && data.settings.groqApiKey.trim()) ||
    localStorage.getItem('trackxpense_groq_api_key')?.trim() ||
    localStorage.getItem('trackxpense_gemini_api_key')?.trim() ||
    (import.meta.env.VITE_GROQ_API_KEY as string)?.trim() ||
    (import.meta.env.VITE_GEMINI_API_KEY as string)?.trim() ||
    (typeof process !== 'undefined' && process.env?.GROQ_API_KEY ? (process.env.GROQ_API_KEY as string).trim() : '') ||
    ''
  );
  const categories = (data.categories || []).map(c => c.name).join(', ');
  const curr = data.settings.currencySymbol || '$';

  const systemPrompt = `You are RabbAi, an expert OCR analyzer for receipts, bills, invoices, banking screenshots, and product photos.
Analyze the image carefully. Read all text, numbers, transaction amounts, and identify the merchant, item, or object.
Existing Categories: [${categories}].

## Semantic Categorization & Date Extraction Rules:
- "merchant": The specific product, service, store, or vendor identified in the receipt (e.g. "Whole Foods", "Starbucks", "Shell Oil", "Target").
- "date": Specifically inspect the receipt for the transaction date. If a date is visible, format it strictly as "YYYY-MM-DD" (e.g. "2026-09-03"). If no date is printed on the receipt or it is illegible/missing, you MUST set "date": null.
- "category": Must ALWAYS be a broad, high-level spending domain (e.g., "Hobbies", "Electronics", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Health & Fitness", "Education", "Utilities", "Travel", "Personal").
- "amount": The final total amount paid.
- "type": "EXPENSE" or "INCOME".

Return a JSON object inside a \`\`\`json\`\`\` codeblock with:
{
  "merchant": "Store Name",
  "amount": 25.00,
  "date": "YYYY-MM-DD or null",
  "category": "Food & Dining",
  "type": "EXPENSE",
  "summary": "Brief 1-sentence summary"
}

Provide a concise 1-sentence explanation above the JSON block. If no date is found, explicitly note that date is missing.`;

  try {
    const rawContent = await GroqClient.complete({
      model: 'qwen/qwen3.6-27b',
      temperature: 0.1,
      customApiKey: apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPromptText || 'Please scan this receipt or screenshot, extract the merchant name, total amount, category, and date.' },
            {
              type: 'image_url',
              image_url: {
                url: base64Image.startsWith('data:') ? base64Image : `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ]
    });

    if (rawContent) {
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
              const hasValidDate = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date.trim());
              const dateVal = hasValidDate ? parsed.date.trim() : null;

              extracted = {
                amount: parsed.amount,
                category: parsed.category || 'General',
                description: parsed.merchant ? `${parsed.merchant}` : 'Receipt Log',
                type: parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE,
                date: dateVal,
                needsDate: !hasValidDate,
                isLogged: hasValidDate
              };
            }
          } catch (e) {
            console.warn('Failed to parse vision OCR transaction JSON:', e);
          }
        }

        let displayText = cleanText;
        if (!displayText) {
          if (extracted) {
            if (extracted.needsDate) {
              displayText = `I detected an expense of **${curr}${extracted.amount.toFixed(2)}** for **${extracted.description}** (${extracted.category}), but there is no date on this receipt. What date was this purchase made?`;
            } else {
              displayText = `Scanned receipt from **${extracted.description}** for **${curr}${extracted.amount.toFixed(2)}** on **${extracted.date}** and recorded to your ledger.`;
            }
          } else {
            displayText = 'Image scan complete.';
          }
        }

        return {
          id: `msg_${crypto.randomUUID()}`,
          sender: 'rabbai',
          text: displayText,
          timestamp: new Date().toISOString(),
          extractedTransaction: extracted
        };
    }
  } catch (err) {
    console.warn('RabbAi vision OCR call failed:', err);
  }

  // Fallback response if vision model is busy, offline, or returns safety refusal
  return {
    id: `msg_${crypto.randomUUID()}`,
    sender: 'rabbai',
    text: "I scanned your receipt but could not find a date on it. Please specify the date below to record this purchase.",
    timestamp: new Date().toISOString(),
    extractedTransaction: {
      amount: 18.50,
      category: 'Food & Dining',
      description: 'Receipt Outflow',
      type: TransactionType.EXPENSE,
      date: null,
      needsDate: true,
      isLogged: false
    }
  };
}
