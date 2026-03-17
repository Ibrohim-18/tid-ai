import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Get API key from environment variable (set in Vercel dashboard)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    let response;

    if (action === 'highlight') {
      // Highlight key words in translation
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Identify the most theologically significant words in this religious verse translation. Return a JSON array containing these words as strings. The text is: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              description: 'A theologically significant word from the text.',
            },
          },
        },
      });
    } else if (action === 'kashida') {
      // Apply kashida to Arabic text
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an expert Arabic calligrapher. Add EXACTLY ONE kashida character (ـ U+0640) at the best stretching point inside each long word of this Arabic Quranic text.

STRICT RULES:
- Use ONLY a single ـ per insertion, NEVER two or more consecutive ـ
- Place ـ ONLY between two connected base letters (like بـتـسـشـصـضـطـعـغـفـقـكـلـمـنـهـي)
- NEVER place ـ next to a non-connecting letter (ا أ إ آ د ذ ر ز و ؤ ء)
- NEVER place ـ at the start or end of a word
- NEVER remove, add, or reorder any diacritics/harakat (ً ٌ ٍ َ ُ ِ ّ ْ ٰ)
- NEVER add any new characters except ـ
- Skip short words (3 letters or fewer)
- Return ONLY the modified text, no explanation

Text: ${text}`,
        config: {
          responseMimeType: 'text/plain',
        },
      });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const result = action === 'highlight' 
      ? JSON.parse(response.text.trim()) 
      : response.text?.trim();

    res.status(200).json({ result });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}
