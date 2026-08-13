import { AppData, TransactionType } from '../types';

export interface AIParsedTransaction {
  amount: number | null;
  category: string;
  description: string;
  type: TransactionType;
  isValid: boolean;
  isDenial: boolean;
  source: 'groq_ai' | 'fallback_heuristic';
}

const DEFAULT_GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

/**
 * Bulletproof transaction parsing using Groq's Llama 3.1 8B Instant model.
 * Includes strict try/catch around JSON parsing & safety filter refusals.
 */
export async function parseTransactionWithAI(
  text: string,
  categories: string[],
  userApiKey?: string
): Promise<AIParsedTransaction | null> {
  const rawText = text.trim();
  if (!rawText) return null;

  const apiKey = userApiKey && userApiKey.trim() ? userApiKey.trim() : DEFAULT_GROQ_KEY;

  if (apiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.1,
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
          ],
          response_format: { type: 'json_object' }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (content) {
          try {
            const parsed = JSON.parse(content);
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
          } catch (jsonErr) {
            console.warn('Groq AI returned non-JSON response or refusal text:', jsonErr);
          }
        }
      }
    } catch (err) {
      console.warn('Groq AI request failed, falling back to local NLP:', err);
    }
  }

  // --- Fallback Local Heuristic Parsing ---
  return parseLocalHeuristic(rawText, categories);
}

/**
 * Local heuristic NLP fallback parsing when Groq API key is offline or unavailable.
 */
function parseLocalHeuristic(text: string, categories: string[]): AIParsedTransaction | null {
  const isDenial = /\b(didn't|did not|not|don't|cancelled|never)\b/i.test(text);
  const isIncome = /^(income|\+)|(earned|received|salary|deposit)/i.test(text);
  const type = isIncome ? TransactionType.INCOME : TransactionType.EXPENSE;

  const amountMatch = text.match(/(?:^|\s)\$?(\d+(?:\.\d{1,2})?)(?:\s|$)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

  if (amount === null && !isDenial) return null;

  const cleanedText = text
    .replace(/(?:^|\s)\$?(\d+(?:\.\d{1,2})?)(?:\s|$)/i, ' ')
    .replace(/\b(spent|bought|paid|for|on|income|earned|received|\+)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let category = type === TransactionType.INCOME ? 'Salary' : 'General';
  if (cleanedText) {
    const matched = categories.find(c =>
      c.toLowerCase().includes(cleanedText.toLowerCase()) ||
      cleanedText.toLowerCase().includes(c.toLowerCase())
    );
    if (matched) category = matched;
  }

  return {
    amount,
    category,
    description: cleanedText || text,
    type,
    isValid: !isDenial && amount !== null,
    isDenial,
    source: 'fallback_heuristic'
  };
}

/**
 * Generates dynamic financial advice using Groq Llama 3.1 8B Instant with strict error handling.
 */
export async function generateAIAdvice(data: AppData, userApiKey?: string): Promise<string[] | null> {
  const apiKey = userApiKey && userApiKey.trim() ? userApiKey.trim() : DEFAULT_GROQ_KEY;
  if (!apiKey) return null;

  const income = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;
  const debtTotal = data.debts.filter(d => !d.isSettled && d.type === 'I_OWE').reduce((s, d) => s + d.amount, 0);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a concise financial advisory coach. Return ONLY a JSON object with key "tips" containing an array of 3 short, actionable, friendly bullet point recommendations based on the user's data.`
          },
          {
            role: 'user',
            content: `User balance: ${data.settings.currencySymbol}${balance}, Total Income: ${data.settings.currencySymbol}${income}, Total Expense: ${data.settings.currencySymbol}${expense}, Total Debts Owed: ${data.settings.currencySymbol}${debtTotal}, Profile Monthly Goal: ${data.settings.currencySymbol}${data.profile.monthlyGoal || 0}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (response.ok) {
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.tips) && parsed.tips.length > 0) {
            return parsed.tips;
          }
        } catch (e) {
          console.warn('Failed to parse AI advice JSON:', e);
        }
      }
    }
  } catch (err) {
    console.warn('Groq AI advice generation failed:', err);
  }

  return null;
}
