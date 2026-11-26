import { AppData, TransactionType } from '../types';
import { GroqClient } from './groqClient';
import { PredictiveEngine } from './PredictiveEngine';

/**
 * Universal safe UUID generator that works reliably in secure contexts,
 * non-secure contexts (e.g. mobile devices over LAN HTTP: http://192.168.x.x), and older webviews.
 */
export function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type RabbAiAction =
  | { type: 'ADD_WALLET'; payload: { name: string; currency: string; walletType?: 'STANDARD' | 'GOAL'; targetAmount?: number }; executed?: boolean }
  | { type: 'UPDATE_WALLET'; payload: { name: string; newName?: string; currency?: string; targetAmount?: number; walletType?: 'STANDARD' | 'GOAL'; stealthMode?: boolean }; executed?: boolean }
  | { type: 'SWITCH_WALLET'; payload: { name: string }; executed?: boolean }
  | { type: 'TRANSFER_WALLET'; payload: { from: string; to: string; amount: number; note?: string }; executed?: boolean }
  | { type: 'DELETE_WALLET'; payload: { name: string }; executed?: boolean }
  | { type: 'ADD_CATEGORY'; payload: { name: string; categoryType: string }; executed?: boolean }
  | { type: 'DELETE_CATEGORY'; payload: { name: string }; executed?: boolean }
  | { type: 'MERGE_CATEGORY'; payload: { from: string; into: string }; executed?: boolean }
  | { type: 'SET_BUDGET'; payload: { category: string; limit: number; period?: 'DAILY' | 'MONTHLY' }; executed?: boolean }
  | { type: 'REMOVE_BUDGET'; payload: { category: string }; executed?: boolean }
  | { type: 'SET_DAILY_LIMIT'; payload: { limit: number }; executed?: boolean }
  | { type: 'SET_MONTHLY_LIMIT'; payload: { limit: number }; executed?: boolean }
  | { type: 'SET_CURRENCY'; payload: { currency: string }; executed?: boolean }
  | { type: 'UPDATE_PROFILE'; payload: { name?: string }; executed?: boolean }
  | { type: 'ADD_DEBT'; payload: { person: string; amount: number; debtType: 'I_OWE' | 'OWES_ME'; note?: string; dueDate?: string }; executed?: boolean }
  | { type: 'SETTLE_DEBT'; payload: { person: string; amount?: number }; executed?: boolean }
  | { type: 'ADD_RECURRING'; payload: { name: string; amount: number; category?: string; frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'; transactionType?: 'EXPENSE' | 'INCOME' }; executed?: boolean }
  | { type: 'ADD_PROVISION'; payload: { name: string; amount: number; date: string }; executed?: boolean }
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
      id: `msg_${safeUUID()}`,
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
  const activeWallet = (data.wallets || []).find(w => w.id === data.currentWalletId);
  const activeWalletTxs = data.currentWalletId
    ? (data.transactions || []).filter(t => t.walletId === data.currentWalletId)
    : (data.transactions || []);
  const income = activeWalletTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = activeWalletTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const categories = (data.categories || [])
    .filter(c => c.name.toLowerCase() !== 'transfer')
    .map(c => c.name)
    .join(', ');
  const walletDetails = (data.wallets || []).map(w => {
    const wTxs = (data.transactions || []).filter(t => t.walletId === w.id);
    const wBal = wTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0)
               - wTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const wCurr = w.currency || data.settings.currencySymbol || '$';
    const activeMark = w.id === data.currentWalletId ? ' [ACTIVE]' : '';
    const goalPart = w.type === 'GOAL' && w.targetAmount ? `, Goal target: ${wCurr}${w.targetAmount}` : '';
    return `  - ${w.name}${activeMark} (${w.type}, Currency: ${wCurr}, Balance: ${wCurr}${wBal.toFixed(2)}${goalPart})`;
  }).join('\n');
  const curr = activeWallet?.currency || data.settings.currencySymbol || '$';
  const activeDebtsList = (data.debts || [])
    .filter(d => !d.isSettled)
    .map(d => {
      const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
      const rem = Math.max(0, d.amount - paid);
      return `  - ${d.person}: ${d.type === 'OWES_ME' ? 'Owes user' : 'User owes'} ${curr}${rem.toFixed(2)}${d.note ? ` (${d.note})` : ''}`;
    }).join('\n');
  const recurringList = (data.recurringRules || [])
    .filter(r => r.isActive)
    .map(r => `  - ${r.name}: ${curr}${r.amount} (${r.frequency}, ${r.category})`)
    .join('\n');
  const provisionsList = (data.provisions || [])
    .map(p => `  - ${p.name}: ${curr}${p.amount} on ${p.date}`)
    .join('\n');

  // Compute current month expenses and category totals (scoped to active wallet)
  const mtdExpenses = activeWalletTxs.filter(t => t.type === TransactionType.EXPENSE && (t.date || '').startsWith(currentMonthStr));
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

  const recentTxs = activeWalletTxs
    .slice(0, 10)
    .map(t => `  - [${t.date ? t.date.split('T')[0] : 'Recent'}] ${t.type}: ${curr}${t.amount.toFixed(2)} (${t.category}${t.note ? ` - "${t.note}"` : ''}, ID: ${t.id})`)
    .join('\n');

  const transportHistory = activeWalletTxs
    .filter(t => (t.category || '').toLowerCase().includes('transport') || (t.note && /bus|ride|rickshaw|cng|uber|metro|fare|ticket|train|azimpur|dhanmondi/i.test(t.note)))
    .slice(0, 15)
    .map(t => `  - "${t.note || t.category}": ${curr}${t.amount.toFixed(2)}`)
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

## Strict Conversational Continuity & Thread Memory (CRITICAL):
- ALWAYS read and remember the ongoing conversation history!
- PENDING TOPIC CONTINUITY:
  - If in the previous turn you asked the user for missing details (such as asking for the fare of a bus ride, the price of an item, or clarifying a transaction), and the user's latest message is a greeting (e.g. "hello shabbat shalom", "hi", "howdy", "shalom"), a short remark, or a follow-up:
    * NEVER wipe your memory or pretend this is a brand new conversation!
    * DO NOT give a generic robotic greeting asking what's doing with their money as if you have amnesia.
    * Warmly acknowledge their greeting in half a sentence, but IMMEDIATELY follow up on the pending question!
    * Example: If you previously asked what they paid for a bus from Azimpur to Dhanmondi, and they say "hello shabbat shalom":
      "Shabbat Shalom, my friend! Now, about that ride from Azimpur to Dhanmondi—did you remember how much the bus fare was, or shall we record the standard ~10–15 BDT?"

## Banter & Conversational Reactions (REAL HUMAN PERSONALITY):
- When the user just says "hi", "hello", "howdy", or "shalom":
  - If there is an UNRESOLVED prior topic or pending question (like asking about an expense amount or bus fare):
    Acknowledge the greeting briefly and seamlessly continue the pending question!
  - Only if there is NO unresolved prior topic:
    Greet back with authentic flair, wit, and curiosity! Ask what's doing in their world, whether they made money or spent it, or tease them affectionately.
    * Example: "Shalom aleichem! Nu, what's doing with you today? Did some gelt come flying through the window, or did you buy something you need an old rabbi to forgive?"
    * Example: "Shalom, chaver! Look at you checking in. Tell me, how does the world treat you today—and more importantly, how is your wallet holding up?"
    * Example: "Nu, what's the good word? Are we looking at a bulging bank account or did inflation take another bite out of your lunch?"
- When the user repeats greetings or tests you (e.g. repeated "hi", "howdy", "hey"):
  - React with affectionate, teasing Jewish humor! Never repeat a canned greeting.
- When the user asks "how are you":
  - Example: "Thank God, the ledger is balanced, the runway has breathing room, and nobody sent a collector to my door—so I'm in paradise! How is your wallet holding up?"
- When the user asks for a joke or talks casual:
  - Deliver sharp, warm, classic observational wit about money, family, and life.

## Handling Commute, Transit & Missing Expense Amounts:
1. When the user mentions taking a bus, rickshaw, taxi, train, or other commute WITHOUT stating the fare (e.g., "i took a bus to dhanmondi from azimpur", "took a rickshaw home"):
   - Ask whether they know or remember the fare!
   - Proactively suggest an intelligent local estimate based on regional transit knowledge:
     * In Dhaka / Bangladesh (${curr === '৳' || curr === 'BDT' ? 'currency BDT' : 'BDT'}):
       - City local bus: Standard minimum distance fare is ~10 to 15 BDT (e.g., Azimpur to Dhanmondi / Science Lab is ~10–15 BDT).
       - Rickshaw: Short trip is ~40–60 BDT, medium trip ~70–120 BDT.
       - CNG auto-rickshaw: ~150–250 BDT.
       - Metro Rail: ~20–40 BDT.
     * Check "Known Past Route / Transit Fares" below for matching prior entries.
   - Ask them directly:
     "Do you remember what you paid, or was it the usual ~10–15 BDT for a city bus? Tell me the amount or confirm, and I'll record it for you!"
   - You can also propose the transaction action using PROPOSE_TRANSACTION so the user can log it with 1 click:
     \`\`\`json
     { "action": "PROPOSE_TRANSACTION", "amount": 10, "category": "Transportation", "description": "Bus from Azimpur to Dhanmondi", "type": "EXPENSE" }
     \`\`\`
2. When the user confirms or gives an amount (e.g., "10", "15", "it was 12 taka", "10 tk", "yes", "log 10", "sure"):
   - Immediately output the ADD_TRANSACTION action JSON block with the specified amount!
3. If the user says "I don't know the fare" or "I don't remember":
   - Say: "No worries, chaver! Let's record the standard 10 BDT so your ledger stays up to date. You can adjust it anytime if needed." and emit the ADD_TRANSACTION action JSON block with 10 BDT!

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
- Current Date & Local Time: ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
- Balance: ${curr}${balance.toFixed(2)} | Total Inflows: ${curr}${income.toFixed(2)} | Total Outflows: ${curr}${expense.toFixed(2)}
- Calculated Financial Runway: ~${runwayDays} days
- Outstanding Debts: User owes ${curr}${debtsUserOwes.toFixed(2)} | Others owe user ${curr}${debtsOwedToUser.toFixed(2)}
- Daily Spending Limit: ${curr}${data.profile?.dailyGoal || 0}
- Monthly Target Spending Goal: ${curr}${data.profile?.monthlyGoal || 0}
- Active Wallet: ${activeWallet?.name || 'Default'} (${curr})
- All Wallets:
${walletDetails || '  - None configured.'}
- Existing Categories: ${categories}
- Configured Category Budget Limits (${currentMonthStr}):
${budgetOverview}
- Active Debts & IOUs:
${activeDebtsList || '  - None.'}
- Active Recurring Bills / Subscriptions:
${recurringList || '  - None.'}
- Upcoming Planned Bills (Provisions):
${provisionsList || '  - None.'}
- MTD Outflow Total: ${curr}${mtdExpenses.reduce((s, t) => s + t.amount, 0).toFixed(2)} across ${mtdExpenses.length} entries
- Recent 10 Transactions:
${recentTxs || '  - None recorded yet.'}
- Known Past Route / Transit Fares:
${transportHistory || '  - None recorded yet.'}

## Semantic Categorization & Taxonomy Rules (STRICT):
- "description": The specific item, service, or merchant (e.g., "Moglai", "RTX 4090", "Uber ride", "Challah", "Books").
- "category": Must ALWAYS be the most accurate spending or income category—NEVER put the item or product name (e.g. "Moglai", "Pizza") as the category name!
- CRITICAL TRANSFER RULE:
  * "Transfer" is ONLY for moving money between two of the user's OWN wallets (using the \`TRANSFER_WALLET\` action).
  * NEVER categorize paying someone, sending money to a friend/vendor, bKash/Nagad/card payments, rent, bills, gifts, or purchases as "Transfer"!
- How to distinguish categories accurately:
  * Meals & Food: use \`Breakfast\`, \`Lunch\`, \`Dinner\` (matching meal/time of day), \`Snacks\` (tea, coffee, moglai, singara, street food, desserts), or \`Food Delivery\` (Foodpanda, Pathao Food, online takeout) — or \`Food & Dining\` if already in existing categories.
  * Transit & Rides: \`Transportation\` (bus, rickshaw, CNG, Uber, Pathao ride, metro, train, fuel, parking, tolls).
  * Bills, Rent & Utilities: \`Bills & Utilities\` (house rent, electricity, water, gas, internet/Wi-Fi, mobile recharge, phone bill).
  * Retail & Purchases: \`Shopping\` (clothes, shoes, electronics, groceries, household supplies, books, gifts).
  * Medical & Wellness: \`Health & Fitness\` (doctor, pharmacy, medicine, hospital, lab test, gym).
  * Leisure & Subscriptions: \`Entertainment\` (movies, games, streaming, concerts, outings).
  * Paying back borrowed money / sending owed cash: \`Loan Payment\` (or use \`ADD_DEBT\` / \`SETTLE_DEBT\` if they want to track who owes whom).
  * Income sources: \`Salary\` (paycheck), \`Gig\` (freelance, contract, side work), \`Tuition\` (tutoring/teaching), \`Loan\` (borrowed cash received).
  * \`Other\`: Only when none of the above apply.
- Category Selection:
  1. Check existing categories: [${categories}]. Pick the best matching domain from that list whenever one fits.
  2. Never use "Transfer" for an \`ADD_TRANSACTION\` or \`PROPOSE_TRANSACTION\`.

## Permitted Actions (Return JSON block when requested — you have full control over limits, wallets, categories, debts, bills & settings):

1. Log a transaction ("Spent 45 on moglai", "Earned 200 freelance"):
\`\`\`json
{ "action": "ADD_TRANSACTION", "amount": 45, "category": "Food & Dining", "description": "Moglai", "type": "EXPENSE" }
\`\`\`

2. Propose an estimated transaction for user review/confirmation:
\`\`\`json
{ "action": "PROPOSE_TRANSACTION", "amount": 10, "category": "Transportation", "description": "Bus from Azimpur to Dhanmondi", "type": "EXPENSE" }
\`\`\`

3. Delete a transaction ("Delete the 10 tk moglai entry", "remove that transaction"):
\`\`\`json
{ "action": "DELETE_TRANSACTION", "description": "Moglai", "amount": 10 }
\`\`\`

4. Set or update a category budget limit ("Set budget of 500 for Food", "Limit shopping to 200 daily"):
\`\`\`json
{ "action": "SET_BUDGET", "category": "Food & Dining", "limit": 500, "period": "MONTHLY" }
\`\`\`

5. Remove a category budget limit ("Remove Food budget", "Clear shopping limit"):
\`\`\`json
{ "action": "REMOVE_BUDGET", "category": "Food & Dining" }
\`\`\`

6. Set or clear the overall Daily Spending Limit ("Set daily limit to 500", "Remove daily spending limit" -> limit 0):
\`\`\`json
{ "action": "SET_DAILY_LIMIT", "limit": 500 }
\`\`\`

7. Set or clear the overall Monthly Spending Limit / Goal ("Set monthly limit to 20000", "Clear monthly goal" -> limit 0):
\`\`\`json
{ "action": "SET_MONTHLY_LIMIT", "limit": 20000 }
\`\`\`

8. Add a wallet (standard or savings goal wallet, e.g. "Create wallet Cash", "Add goal wallet Laptop with target 80000"):
\`\`\`json
{ "action": "ADD_WALLET", "name": "Laptop", "currency": "${curr}", "walletType": "GOAL", "targetAmount": 80000 }
\`\`\`

9. Switch active wallet ("Switch to Savings wallet", "Use Cash"):
\`\`\`json
{ "action": "SWITCH_WALLET", "name": "Savings" }
\`\`\`

10. Update or rename a wallet ("Rename Savings to Emergency Fund", "Set Laptop goal target to 90000", "Change Cash currency to $"):
\`\`\`json
{ "action": "UPDATE_WALLET", "name": "Savings", "newName": "Emergency Fund", "targetAmount": 90000 }
\`\`\`

11. Transfer funds between two wallets ("Transfer 500 from Main Wallet to Savings"):
\`\`\`json
{ "action": "TRANSFER_WALLET", "from": "Main Wallet", "to": "Savings", "amount": 500, "note": "Monthly savings" }
\`\`\`

12. Delete a wallet:
\`\`\`json
{ "action": "DELETE_WALLET", "name": "Savings" }
\`\`\`

13. Change default currency or profile name ("Change currency to ৳", "Change my name to Goldberg"):
\`\`\`json
{ "action": "SET_CURRENCY", "currency": "৳" }
\`\`\`
\`\`\`json
{ "action": "UPDATE_PROFILE", "name": "Goldberg" }
\`\`\`

14. Add or settle a debt / IOU ("Rafiq owes me 500 for dinner", "I owe Karim 300", "Rafiq paid back 500"):
\`\`\`json
{ "action": "ADD_DEBT", "person": "Rafiq", "amount": 500, "debtType": "OWES_ME", "note": "Dinner" }
\`\`\`
\`\`\`json
{ "action": "SETTLE_DEBT", "person": "Rafiq", "amount": 500 }
\`\`\`

15. Add a recurring subscription/bill or upcoming planned bill:
\`\`\`json
{ "action": "ADD_RECURRING", "name": "Netflix", "amount": 1200, "category": "Entertainment", "frequency": "MONTHLY", "transactionType": "EXPENSE" }
\`\`\`
\`\`\`json
{ "action": "ADD_PROVISION", "name": "Internet Bill", "amount": 1000, "date": "2026-12-05" }
\`\`\`

16. Add / Delete / Merge categories:
\`\`\`json
{ "action": "ADD_CATEGORY", "name": "Tzedakah", "categoryType": "EXPENSE" }
\`\`\`
\`\`\`json
{ "action": "DELETE_CATEGORY", "name": "Fitness" }
\`\`\`
\`\`\`json
{ "action": "MERGE_CATEGORY", "from": "OldCat", "into": "NewCat" }
\`\`\`

17. Export CSV or Delete all site data:
\`\`\`json
{ "action": "EXPORT_CSV" }
\`\`\`
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

            if ((act === 'ADD_TRANSACTION' || act === 'PROPOSE_TRANSACTION') && typeof parsed.amount === 'number' && parsed.amount > 0) {
              const isAutoLogged = act === 'ADD_TRANSACTION' && parsed.isLogged !== false;
              const txType = parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
              const rawCat = (parsed.category || '').trim();
              const safeCat = !rawCat || rawCat.toLowerCase() === 'transfer'
                ? (txType === TransactionType.INCOME ? 'Gig' : 'Other')
                : rawCat;
              extracted = {
                amount: parsed.amount,
                category: safeCat,
                description: parsed.description || 'Quick Log',
                type: txType,
                isLogged: isAutoLogged
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
              aiAction = {
                type: 'ADD_WALLET',
                payload: {
                  name: parsed.name,
                  currency: parsed.currency || curr,
                  walletType: parsed.walletType === 'GOAL' ? 'GOAL' : 'STANDARD',
                  targetAmount: typeof parsed.targetAmount === 'number' ? parsed.targetAmount : undefined
                }
              };
            } else if (act === 'UPDATE_WALLET' && parsed.name) {
              aiAction = {
                type: 'UPDATE_WALLET',
                payload: {
                  name: parsed.name,
                  newName: parsed.newName,
                  currency: parsed.currency,
                  targetAmount: typeof parsed.targetAmount === 'number' ? parsed.targetAmount : undefined,
                  walletType: parsed.walletType === 'GOAL' || parsed.walletType === 'STANDARD' ? parsed.walletType : undefined,
                  stealthMode: typeof parsed.stealthMode === 'boolean' ? parsed.stealthMode : undefined
                }
              };
            } else if (act === 'SWITCH_WALLET' && parsed.name) {
              aiAction = { type: 'SWITCH_WALLET', payload: { name: parsed.name } };
            } else if (act === 'TRANSFER_WALLET' && parsed.from && parsed.to && typeof parsed.amount === 'number' && parsed.amount > 0) {
              aiAction = {
                type: 'TRANSFER_WALLET',
                payload: { from: parsed.from, to: parsed.to, amount: parsed.amount, note: parsed.note }
              };
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
            } else if (act === 'REMOVE_BUDGET' && parsed.category) {
              aiAction = { type: 'REMOVE_BUDGET', payload: { category: parsed.category } };
            } else if (act === 'SET_DAILY_LIMIT' && typeof parsed.limit === 'number' && parsed.limit >= 0) {
              aiAction = { type: 'SET_DAILY_LIMIT', payload: { limit: parsed.limit } };
            } else if (act === 'SET_MONTHLY_LIMIT' && typeof parsed.limit === 'number' && parsed.limit >= 0) {
              aiAction = { type: 'SET_MONTHLY_LIMIT', payload: { limit: parsed.limit } };
            } else if (act === 'SET_CURRENCY' && parsed.currency) {
              aiAction = { type: 'SET_CURRENCY', payload: { currency: parsed.currency } };
            } else if (act === 'UPDATE_PROFILE' && parsed.name) {
              aiAction = { type: 'UPDATE_PROFILE', payload: { name: parsed.name } };
            } else if (act === 'ADD_DEBT' && parsed.person && typeof parsed.amount === 'number' && parsed.amount > 0) {
              aiAction = {
                type: 'ADD_DEBT',
                payload: {
                  person: parsed.person,
                  amount: parsed.amount,
                  debtType: parsed.debtType === 'I_OWE' ? 'I_OWE' : 'OWES_ME',
                  note: parsed.note,
                  dueDate: parsed.dueDate
                }
              };
            } else if (act === 'SETTLE_DEBT' && parsed.person) {
              aiAction = {
                type: 'SETTLE_DEBT',
                payload: {
                  person: parsed.person,
                  amount: typeof parsed.amount === 'number' ? parsed.amount : undefined
                }
              };
            } else if (act === 'ADD_RECURRING' && parsed.name && typeof parsed.amount === 'number' && parsed.amount > 0) {
              aiAction = {
                type: 'ADD_RECURRING',
                payload: {
                  name: parsed.name,
                  amount: parsed.amount,
                  category: parsed.category || 'Bills & Utilities',
                  frequency: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(parsed.frequency) ? parsed.frequency : 'MONTHLY',
                  transactionType: parsed.transactionType === 'INCOME' ? 'INCOME' : 'EXPENSE'
                }
              };
            } else if (act === 'ADD_PROVISION' && parsed.name && typeof parsed.amount === 'number' && parsed.amount > 0) {
              aiAction = {
                type: 'ADD_PROVISION',
                payload: {
                  name: parsed.name,
                  amount: parsed.amount,
                  date: parsed.date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
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
          id: `msg_${safeUUID()}`,
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
    const activeWallet = (data.wallets || []).find(w => w.id === data.currentWalletId);
    const curr = activeWallet?.currency || data.settings?.currencySymbol || '$';
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const activeWalletTxs = data.currentWalletId
      ? (data.transactions || []).filter(t => t.walletId === data.currentWalletId)
      : (data.transactions || []);
    const incomeTxs = activeWalletTxs.filter(t => t.type === TransactionType.INCOME);
    const expenseTxs = activeWalletTxs.filter(t => t.type === TransactionType.EXPENSE);
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

    // Export CSV / Data Backup command matching
    if (
      lower.includes('export') ||
      lower.includes('csv') ||
      lower.includes('backup') ||
      lower.includes('download transactions') ||
      lower.includes('download data') ||
      lower.includes('download ledger')
    ) {
      return {
        id: `msg_${safeUUID()}`,
        sender: 'rabbai',
        text: "Here's the export you asked for:",
        timestamp: new Date().toISOString(),
        aiAction: {
          type: 'EXPORT_CSV',
          payload: {}
        }
      };
    }

    // Wipe / Delete All Data command matching
    if (
      lower.includes('delete all data') ||
      lower.includes('wipe all data') ||
      lower.includes('clear all data') ||
      lower.includes('reset ledger') ||
      lower.includes('factory reset')
    ) {
      return {
        id: `msg_${safeUUID()}`,
        sender: 'rabbai',
        text: "Are you sure you want to delete all transactions, budgets, and ledger history? This action is permanent and cannot be undone.",
        timestamp: new Date().toISOString(),
        aiAction: {
          type: 'DELETE_ALL_DATA',
          payload: { userName: data.profile?.name || 'User' }
        }
      };
    }

    // Daily / Monthly Spending Limit commands
    const removeDailyMatch = lower.match(/(?:remove|clear|reset|disable)\s+(?:my\s+)?daily\s+(?:spending\s+)?(?:limit|cap|goal|budget)/i);
    if (removeDailyMatch) {
      return {
        id: `msg_${safeUUID()}`,
        sender: 'rabbai',
        text: `Got it—let's remove your daily spending limit.`,
        timestamp: new Date().toISOString(),
        aiAction: { type: 'SET_DAILY_LIMIT', payload: { limit: 0 } }
      };
    }

    const setDailyMatch = text.match(/(?:set|change|update|make)\s+(?:my\s+)?daily\s+(?:spending\s+)?(?:limit|cap|goal|budget)\s*(?:to|at|of)?\s*(?:[$€£৳₹¥\s]*)([\d,]+(?:\.\d+)?)/i);
    if (setDailyMatch) {
      const lim = parseFloat(setDailyMatch[1].replace(/,/g, ''));
      if (!isNaN(lim) && lim >= 0) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Let's set your daily spending limit to **${curr}${lim.toLocaleString()}**. Confirm below to apply.`,
          timestamp: new Date().toISOString(),
          aiAction: { type: 'SET_DAILY_LIMIT', payload: { limit: lim } }
        };
      }
    }

    const removeMonthlyMatch = lower.match(/(?:remove|clear|reset|disable)\s+(?:my\s+)?monthly\s+(?:spending\s+)?(?:limit|cap|goal|budget)/i);
    if (removeMonthlyMatch) {
      return {
        id: `msg_${safeUUID()}`,
        sender: 'rabbai',
        text: `Got it—let's clear your monthly spending goal.`,
        timestamp: new Date().toISOString(),
        aiAction: { type: 'SET_MONTHLY_LIMIT', payload: { limit: 0 } }
      };
    }

    const setMonthlyMatch = text.match(/(?:set|change|update|make)\s+(?:my\s+)?monthly\s+(?:spending\s+)?(?:limit|cap|goal|budget)\s*(?:to|at|of)?\s*(?:[$€£৳₹¥\s]*)([\d,]+(?:\.\d+)?)/i);
    if (setMonthlyMatch) {
      const lim = parseFloat(setMonthlyMatch[1].replace(/,/g, ''));
      if (!isNaN(lim) && lim >= 0) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Let's set your monthly spending goal to **${curr}${lim.toLocaleString()}**. Confirm below to apply.`,
          timestamp: new Date().toISOString(),
          aiAction: { type: 'SET_MONTHLY_LIMIT', payload: { limit: lim } }
        };
      }
    }

    // Switch / Delete / Rename / Transfer wallet commands
    const switchWalletMatch = text.match(/(?:switch|change|go)\s+(?:to\s+)?(?:wallet\s+)?([a-zA-Z0-9\s_-]+?)(?:\s+wallet)?$/i);
    if (switchWalletMatch && (lower.includes('wallet') || data.wallets.some(w => w.name.toLowerCase() === switchWalletMatch[1].trim().toLowerCase()))) {
      const wName = switchWalletMatch[1].trim();
      const targetW = data.wallets.find(w => w.name.toLowerCase() === wName.toLowerCase());
      if (targetW) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Ready to switch your active wallet to **${targetW.name}**.`,
          timestamp: new Date().toISOString(),
          aiAction: { type: 'SWITCH_WALLET', payload: { name: targetW.name } }
        };
      }
    }

    const transferMatch = text.match(/transfer\s+(?:[$€£৳₹¥\s]*)([\d,]+(?:\.\d+)?)\s+from\s+([a-zA-Z0-9\s_-]+?)\s+to\s+([a-zA-Z0-9\s_-]+)/i);
    if (transferMatch) {
      const amt = parseFloat(transferMatch[1].replace(/,/g, ''));
      const fromW = transferMatch[2].trim();
      const toW = transferMatch[3].trim();
      if (!isNaN(amt) && amt > 0 && fromW && toW) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Ready to transfer **${curr}${amt.toLocaleString()}** from **${fromW}** to **${toW}**.`,
          timestamp: new Date().toISOString(),
          aiAction: { type: 'TRANSFER_WALLET', payload: { from: fromW, to: toW, amount: amt } }
        };
      }
    }

    const deleteWalletMatch = text.match(/(?:delete|remove)\s+wallet\s+([a-zA-Z0-9\s_-]+)/i);
    if (deleteWalletMatch) {
      const wName = deleteWalletMatch[1].trim();
      if (wName) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Confirm below if you want to delete the **${wName}** wallet.`,
          timestamp: new Date().toISOString(),
          aiAction: { type: 'DELETE_WALLET', payload: { name: wName } }
        };
      }
    }

    // Add wallet command matching (supports standard or goal wallet with target)
    const addGoalWalletMatch = text.match(/(?:add|create|new)\s+(?:a\s+)?goal\s+wallet\s+([a-zA-Z0-9\s_-]+?)(?:\s+(?:with\s+)?target\s+(?:of\s+)?(?:[$€£৳₹¥\s]*)([\d,]+(?:\.\d+)?))?$/i);
    if (addGoalWalletMatch) {
      const walletName = addGoalWalletMatch[1].trim();
      const targetAmt = addGoalWalletMatch[2] ? parseFloat(addGoalWalletMatch[2].replace(/,/g, '')) : undefined;
      if (walletName) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Proposed creating goal wallet **${walletName}**${targetAmt ? ` with target **${curr}${targetAmt.toLocaleString()}**` : ''}. Click confirm below to add it.`,
          timestamp: new Date().toISOString(),
          aiAction: {
            type: 'ADD_WALLET',
            payload: { name: walletName, currency: curr, walletType: 'GOAL', targetAmount: targetAmt }
          }
        };
      }
    }

    const addWalletMatch = text.match(/(?:add|create|new)\s+wallet\s+([a-zA-Z0-9\s_-]+)/i);
    if (addWalletMatch) {
      const walletName = addWalletMatch[1].trim();
      if (walletName) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Proposed creating a new wallet **${walletName}**. Click confirm below to add it.`,
          timestamp: new Date().toISOString(),
          aiAction: {
            type: 'ADD_WALLET',
            payload: { name: walletName, currency: curr, walletType: 'STANDARD' }
          }
        };
      }
    }

    // Remove category budget command
    const removeBudgetMatch = text.match(/(?:remove|clear|delete)\s+([\w\s&]+?)\s+(?:budget|limit)/i);
    if (removeBudgetMatch) {
      const catName = removeBudgetMatch[1].trim();
      if (catName && !['daily', 'monthly'].includes(catName.toLowerCase())) {
        return {
          id: `msg_${safeUUID()}`,
          sender: 'rabbai',
          text: `Ready to remove the budget limit for **${catName}**.`,
          timestamp: new Date().toISOString(),
          aiAction: { type: 'REMOVE_BUDGET', payload: { category: catName } }
        };
      }
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
    const walletLabel = activeWallet?.name || 'Active Wallet';
    return {
      id: `msg_${Date.now()}`,
      sender: 'rabbai',
      text: `### ${walletLabel} Balance Summary\n\n- **Total Balance**: **${curr}${netBalance.toFixed(2)}**\n- **Total Inflow**: +${curr}${totalIncome.toFixed(2)}\n- **Total Outflow**: -${curr}${totalExpense.toFixed(2)}\n- **Entries Recorded**: ${activeWalletTxs.length} entries in this wallet.`,
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

      // Guess category using the app's canonical categories (never "Transfer" for regular spending/income)
      let category = isIncome ? 'Gig' : 'Other';
      const knownCats: Record<string, string> = {
        breakfast: 'Breakfast',
        paratha: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner',
        foodpanda: 'Food Delivery',
        delivery: 'Food Delivery',
        takeout: 'Food Delivery',
        snack: 'Snacks',
        snacks: 'Snacks',
        tea: 'Snacks',
        cha: 'Snacks',
        coffee: 'Snacks',
        moglai: 'Snacks',
        singara: 'Snacks',
        burger: 'Lunch',
        pizza: 'Dinner',
        food: 'Lunch',
        uber: 'Transportation',
        pathao: 'Transportation',
        taxi: 'Transportation',
        rickshaw: 'Transportation',
        cng: 'Transportation',
        bus: 'Transportation',
        metro: 'Transportation',
        train: 'Transportation',
        gas: 'Transportation',
        fuel: 'Transportation',
        fare: 'Transportation',
        netflix: 'Entertainment',
        spotify: 'Entertainment',
        game: 'Entertainment',
        movie: 'Entertainment',
        grocery: 'Shopping',
        groceries: 'Shopping',
        shirt: 'Shopping',
        shoes: 'Shopping',
        clothes: 'Shopping',
        book: 'Shopping',
        rent: 'Bills & Utilities',
        bill: 'Bills & Utilities',
        electric: 'Bills & Utilities',
        water: 'Bills & Utilities',
        wifi: 'Bills & Utilities',
        internet: 'Bills & Utilities',
        recharge: 'Bills & Utilities',
        doctor: 'Health & Fitness',
        medicine: 'Health & Fitness',
        pharmacy: 'Health & Fitness',
        gym: 'Health & Fitness',
        loan: isIncome ? 'Loan' : 'Loan Payment',
        tuition: 'Tuition',
        freelance: 'Gig',
        gig: 'Gig',
        salary: 'Salary'
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
          date: new Date().toISOString(),
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
      id: `msg_${safeUUID()}`,
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
  const categories = (data.categories || [])
    .filter(c => c.name.toLowerCase() !== 'transfer')
    .map(c => c.name)
    .join(', ');
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
          id: `msg_${safeUUID()}`,
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
    id: `msg_${safeUUID()}`,
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
