import { AppData, TransactionType } from '../types';
import { GroqClient } from './groqClient';

export interface AIParsedTransaction {
  amount: number | null;
  category: string;
  description: string;
  type: TransactionType;
  isValid: boolean;
  isDenial: boolean;
  source: 'groq_ai' | 'fallback_heuristic';
}

/**
 * Bulletproof transaction parsing using Groq AI via secure edge proxy.
 * Automatically falls back to high-accuracy local regex/heuristics if offline.
 */
export async function parseTransactionWithAI(
  text: string,
  categories: string[],
  customApiKey?: string,
  enableAi: boolean = false
): Promise<AIParsedTransaction | null> {
  const rawText = text.trim();
  if (!rawText) return null;

  if (!enableAi) {
    return parseFallbackLocal(rawText, categories);
  }

  try {
    const rawContent = await GroqClient.complete({
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
      customApiKey,
      messages: [
        {
          role: 'system',
          content: `You are a financial transaction extractor. Analyze the input and extract transaction details.
Available Categories: ${categories.join(', ')}.

Return ONLY a valid JSON object with the following schema:
{
  "amount": number or null,
  "category": string (match available categories if appropriate, else concise category name),
  "description": string,
  "type": "INCOME" or "EXPENSE",
  "is_valid": boolean (MUST BE false if the user is denying, cancelling, or stating they DID NOT spend or earn something, e.g. "I didn't spend", "didn't buy", "cancelled", "not paying")
}`
        },
        {
          role: 'user',
          content: rawText
        }
      ]
    });

    if (rawContent) {
      const parsed = GroqClient.extractJson(rawContent);
      if (parsed) {
        const amount = typeof parsed.amount === 'number' && !isNaN(parsed.amount) ? parsed.amount : null;
        const isValid = parsed.is_valid !== false;
        const isDenial = parsed.is_valid === false;
        const type = parsed.type === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
        const category = parsed.category || (type === TransactionType.INCOME ? 'Salary' : 'General');
        const description = parsed.description || rawText;

        return {
          amount,
          category,
          description,
          type,
          isValid,
          isDenial,
          source: 'groq_ai'
        };
      }
    }
  } catch (err) {
    // Edge/network failed; fall back to local heuristic below
  }

  // --- Fallback Local Heuristic Parsing ---
  const lower = rawText.toLowerCase();

  // Check for denials/cancellations
  const denialKeywords = ['didn\'t', 'did not', 'never', 'cancel', 'cancelled', 'not paying', 'not spend', 'haven\'t spent'];
  const isDenial = denialKeywords.some(k => lower.includes(k));

  // Heuristic Income detection
  const incomeKeywords = ['received', 'got', 'salary', 'freelance', 'sold', 'earned', 'deposit', 'income'];
  const isIncome = incomeKeywords.some(k => lower.includes(k));
  const type = isIncome ? TransactionType.INCOME : TransactionType.EXPENSE;

  // Extract amount
  const amountMatch = rawText.match(/(?:[\$৳€£¥]|tk\.?|bdt)?\s*(\d+(?:[,\.]\d{1,2})?)\s*(?:[\$৳€£¥]|tk\.?|bdt)?/i);
  let amount: number | null = null;
  if (amountMatch && amountMatch[1]) {
    const cleanAmount = amountMatch[1].replace(',', '');
    const num = parseFloat(cleanAmount);
    if (!isNaN(num)) amount = num;
  }

  // Match category
  let matchedCat = type === TransactionType.INCOME ? 'Salary' : 'General';
  for (const cat of categories) {
    if (lower.includes(cat.toLowerCase())) {
      matchedCat = cat;
      break;
    }
  }

  return {
    amount,
    category: matchedCat,
    description: rawText,
    type,
    isValid: !isDenial,
    isDenial,
    source: 'fallback_heuristic'
  };
}

/**
 * Generate smart financial insights using Groq via secure edge proxy.
 */
export async function getSmartFinancialAdvice(
  data: AppData,
  customApiKey?: string
): Promise<string[] | null> {
  if (!data.settings?.enableAiParsing) {
    return null;
  }

  const income = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const debtTotal = data.debts.filter(d => !d.isSettled && d.type === 'I_OWE').reduce((s, d) => s + d.amount, 0);

  try {
    const rawContent = await GroqClient.complete({
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      customApiKey,
      messages: [
        {
          role: 'system',
          content: `You are a concise financial advisory coach. Return ONLY a JSON object with key "tips" containing an array of 3 short, actionable, friendly bullet point recommendations based on the user's data.`
        },
        {
          role: 'user',
          content: `User balance: ${data.settings.currencySymbol}${balance}, Total Income: ${data.settings.currencySymbol}${income}, Total Expense: ${data.settings.currencySymbol}${expense}, Total Debts Owed: ${data.settings.currencySymbol}${debtTotal}, Profile Monthly Goal: ${data.settings.currencySymbol}${data.profile.monthlyGoal || 0}`
        }
      ]
    });

    if (rawContent) {
      const parsed = GroqClient.extractJson(rawContent);
      if (parsed && Array.isArray(parsed.tips) && parsed.tips.length > 0) {
        return parsed.tips;
      }
    }
  } catch (err) {
    // Advice generation fallback
  }

  return null;
}
