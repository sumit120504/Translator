import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { TranslationResult } from './types';
import { validateTranslationResult } from './validate';

// Built-in curated dataset for high quality offline/instant responses
const CURATED_DICTIONARY: Record<string, TranslationResult> = {
  book: {
    word: 'book',
    partOfSpeech: 'noun',
    hindiTranslation: ['किताब', 'पुस्तक'],
    englishMeaning: 'A set of printed or written pages bound together with a cover.',
    hindiMeaning: 'कागज़ों या पन्नों का वह संग्रह जो एक जिल्द में बंधा होता है और जिसे पढ़ा जाता है।',
    example: 'She sat by the window reading an interesting book.',
  },
  resilient: {
    word: 'resilient',
    partOfSpeech: 'adjective',
    hindiTranslation: ['लचीला', 'सहनशील', 'दृढ़'],
    englishMeaning: 'Able to withstand or recover quickly from difficult conditions.',
    hindiMeaning: 'कठिनाइयों या संकट से जल्दी उबरने में सक्षम।',
    example: 'He is a resilient person who never gives up during tough times.',
  },
  serendipity: {
    word: 'serendipity',
    partOfSpeech: 'noun',
    hindiTranslation: ['सौभाग्य', 'आकस्मिक लाभ', 'सुखद संयोग'],
    englishMeaning: 'The occurrence and development of events by chance in a happy or beneficial way.',
    hindiMeaning: 'संयोगवश किसी सुखद या लाभकारी वस्तु का मिल जाना।',
    example: 'Discovering this wonderful bookstore was pure serendipity.',
  },
  ephemeral: {
    word: 'ephemeral',
    partOfSpeech: 'adjective',
    hindiTranslation: ['क्षणभंगुर', 'अल्पकालिक'],
    englishMeaning: 'Lasting for a very short time.',
    hindiMeaning: 'जो बहुत कम समय के लिए रहे या जल्दी नष्ट हो जाए।',
    example: 'The beauty of spring cherry blossoms is ephemeral.',
  },
  ubiquitous: {
    word: 'ubiquitous',
    partOfSpeech: 'adjective',
    hindiTranslation: ['सर्वव्यापी', 'सब जगह मौजूद'],
    englishMeaning: 'Present, appearing, or found everywhere.',
    hindiMeaning: 'जो हर जगह उपस्थित या पाया जाने वाला हो।',
    example: 'Smartphones have become ubiquitous in modern life.',
  },
  run: {
    word: 'run',
    partOfSpeech: 'verb',
    hindiTranslation: ['दौड़ना', 'भागना'],
    englishMeaning: 'Move at a speed faster than a walk, never having both feet on the ground at the same time.',
    hindiMeaning: 'तेज़ गति से अपने पैरों से आगे बढ़ना।',
    example: 'He runs five kilometers every morning to stay fit.',
  },
  love: {
    word: 'love',
    partOfSpeech: 'noun / verb',
    hindiTranslation: ['प्रेम', 'प्यार', 'स्नेह'],
    englishMeaning: 'An intense feeling of deep affection and care for someone or something.',
    hindiMeaning: 'किसी के प्रति अत्यधिक गहरा स्नेह, लगाव या आदर का भाव।',
    example: 'Their love and dedication to their family is inspiring.',
  },
  compassion: {
    word: 'compassion',
    partOfSpeech: 'noun',
    hindiTranslation: ['करुणा', 'सहानुभूति', 'दया'],
    englishMeaning: 'Sympathetic pity and concern for the sufferings or misfortunes of others.',
    hindiMeaning: 'दूसरों के दुख या कष्ट को देखकर मन में उठने वाली दया व सहायता की भावना।',
    example: 'The nurse treated all patients with warmth and deep compassion.',
  },
  perseverance: {
    word: 'perseverance',
    partOfSpeech: 'noun',
    hindiTranslation: ['दृढ़ता', 'लगन', 'अध्यवसाय'],
    englishMeaning: 'Persistence in doing something despite difficulty or delay in achieving success.',
    hindiMeaning: 'कठिनाइयों और बाधाओं के बावजूद अपने लक्ष्य की ओर लगातार लगे रहने का गुण।',
    example: 'Her perseverance finally led to her graduation with top honors.',
  },
};

/**
 * Fetch phonetics audio from the Free Dictionary API
 */
async function fetchDictionaryAudio(word: string): Promise<string | undefined> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return undefined;
    const data = await res.json();
    if (Array.isArray(data) && data[0]?.phonetics) {
      for (const p of data[0].phonetics) {
        if (p.audio && p.audio.trim().length > 0) {
          return p.audio;
        }
      }
    }
  } catch {
    // Non-blocking: Audio is optional
  }
  return undefined;
}

/**
 * Translate using OpenRouter API
 */
async function translateWithOpenRouter(
  word: string,
  apiKey: string,
  model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet'
): Promise<TranslationResult> {
  const systemPrompt = `You are an expert bilingual lexicographer specializing in English and Hindi.
Given an English word, provide:
1. part of speech (noun, verb, adjective, adverb, etc.)
2. 2-3 most common and accurate Hindi translations (in Devanagari script)
3. clear, simple English definition
4. Hindi meaning/definition (written completely in natural, grammatically correct Hindi Devanagari script, explaining the concept)
5. a natural example sentence in English.

Return ONLY a valid JSON object with exactly this schema:
{
  "word": "word",
  "partOfSpeech": "part of speech",
  "hindiTranslation": ["अनुवाद 1", "अनुवाद 2"],
  "englishMeaning": "Definition in English",
  "hindiMeaning": "अर्थ हिंदी में",
  "example": "Example sentence using the word in English"
}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://wordlearner.app',
      'X-Title': 'WordLearner',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Define and translate the English word: "${word}"` },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Empty response from OpenRouter API');
  }

  let cleaned = rawContent.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!validateTranslationResult(parsed)) {
    throw new Error('Invalid translation schema returned by OpenRouter');
  }

  return parsed;
}

/**
 * Translate using Claude API (Anthropic)
 */
async function translateWithClaude(word: string, apiKey: string): Promise<TranslationResult> {
  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are an expert bilingual lexicographer specializing in English and Hindi.
Given an English word, provide:
1. part of speech (noun, verb, adjective, adverb, etc.)
2. 2-3 most common and accurate Hindi translations (in Devanagari script)
3. clear, simple English definition
4. Hindi meaning/definition (written completely in natural, grammatically correct Hindi Devanagari script, explaining the concept)
5. a natural example sentence in English.

Return ONLY a valid JSON object with exactly this schema:
{
  "word": "word",
  "partOfSpeech": "part of speech",
  "hindiTranslation": ["अनुवाद 1", "अनुवाद 2"],
  "englishMeaning": "Definition in English",
  "hindiMeaning": "अर्थ हिंदी में",
  "example": "Example sentence using the word in English"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 600,
    temperature: 0.1,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Define and translate the English word: "${word}"`,
      },
    ],
  });

  const contentBlock = response.content[0];
  if (contentBlock.type !== 'text') {
    throw new Error('Unexpected non-text response from Claude API');
  }

  let rawJson = contentBlock.text.trim();
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(rawJson);
  if (!validateTranslationResult(parsed)) {
    throw new Error('Invalid translation schema returned by Claude');
  }

  return parsed;
}

/**
 * Translate using Google Gemini API
 */
async function translateWithGemini(word: string, apiKey: string): Promise<TranslationResult> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are an expert bilingual lexicographer specializing in English and Hindi.
Provide dictionary details for the English word: "${word}".
Return ONLY a valid raw JSON object (no markdown, no extra commentary) with the following structure:
{
  "word": "${word}",
  "partOfSpeech": "part of speech",
  "hindiTranslation": ["हिंदी अनुवाद 1", "हिंदी अनुवाद 2"],
  "englishMeaning": "English definition of the primary sense",
  "hindiMeaning": "हिंदी में सरल और सटीक अर्थ (Devanagari)",
  "example": "A clear, natural example sentence in English"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text || '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!validateTranslationResult(parsed)) {
    throw new Error('Invalid translation schema returned by Gemini');
  }

  return parsed;
}

/**
 * Fallback translation using Free Dictionary API + MyMemory translation
 */
async function translateWithFreeServices(word: string): Promise<TranslationResult> {
  const normalized = word.toLowerCase().trim();
  if (CURATED_DICTIONARY[normalized]) {
    return CURATED_DICTIONARY[normalized];
  }

  let definition = '';
  let partOfSpeech = 'word';
  let example = `He used the word "${word}" in conversation.`;

  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
      if (Array.isArray(dictData) && dictData[0]?.meanings?.length > 0) {
        const meaning = dictData[0].meanings[0];
        partOfSpeech = meaning.partOfSpeech || 'noun';
        if (meaning.definitions?.length > 0) {
          definition = meaning.definitions[0].definition || '';
          if (meaning.definitions[0].example) {
            example = meaning.definitions[0].example;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Free dictionary lookup failed:', err);
  }

  if (!definition) {
    definition = `Relating to or denoting ${word}.`;
  }

  let hindiTranslations: string[] = [];
  try {
    const transRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|hi`
    );
    if (transRes.ok) {
      const transData = await transRes.json();
      const translation = transData?.responseData?.translatedText;
      if (translation && translation !== word && !translation.includes('MYMEMORY')) {
        hindiTranslations = translation
          .split(/[,;/|]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('MyMemory lookup failed:', err);
  }

  if (hindiTranslations.length === 0) {
    hindiTranslations = [`${word} (हिंदी)`];
  }

  let hindiMeaning = '';
  try {
    const defTransRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(definition)}&langpair=en|hi`
    );
    if (defTransRes.ok) {
      const defTransData = await defTransRes.json();
      const defTranslation = defTransData?.responseData?.translatedText;
      if (defTranslation && !defTranslation.includes('MYMEMORY')) {
        hindiMeaning = defTranslation;
      }
    }
  } catch {
    // Ignore fallback failure
  }

  if (!hindiMeaning) {
    hindiMeaning = `${hindiTranslations[0]} से संबंधित अर्थ या विवरण।`;
  }

  return {
    word,
    partOfSpeech,
    hindiTranslation: hindiTranslations,
    englishMeaning: definition,
    hindiMeaning,
    example,
  };
}

/**
 * Main translation handler with swappable providers and automatic fallback
 */
export async function getWordTranslation(word: string): Promise<TranslationResult> {
  const normalized = word.toLowerCase().trim();

  // 1. Check curated exact matches first for lightning speed & best accuracy
  if (CURATED_DICTIONARY[normalized]) {
    const result = { ...CURATED_DICTIONARY[normalized] };
    const audio = await fetchDictionaryAudio(normalized);
    if (audio) result.audioUrl = audio;
    return result;
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const preferredProvider = process.env.AI_PROVIDER || 'auto';

  let result: TranslationResult | null = null;
  let lastError: any = null;

  // 2. Try OpenRouter API (if key is set and provider is auto/openrouter)
  if ((preferredProvider === 'openrouter' || preferredProvider === 'auto') && openRouterKey) {
    try {
      result = await translateWithOpenRouter(normalized, openRouterKey);
    } catch (err) {
      console.warn('OpenRouter API translation failed, attempting fallback:', err);
      lastError = err;
    }
  }

  // 3. Try Claude API
  if (!result && (preferredProvider === 'anthropic' || preferredProvider === 'auto') && anthropicKey) {
    try {
      result = await translateWithClaude(normalized, anthropicKey);
    } catch (err) {
      console.warn('Claude API translation failed, attempting fallback:', err);
      lastError = err;
    }
  }

  // 4. Try Gemini API
  if (!result && (preferredProvider === 'gemini' || preferredProvider === 'auto') && geminiKey) {
    try {
      result = await translateWithGemini(normalized, geminiKey);
    } catch (err) {
      console.warn('Gemini API translation failed, attempting fallback:', err);
      lastError = err;
    }
  }

  // 5. Free services fallback (Free Dictionary API + MyMemory + curated dictionary)
  if (!result) {
    try {
      result = await translateWithFreeServices(normalized);
    } catch (err) {
      console.error('All translation providers failed:', err, lastError);
      throw new Error(`Could not find details for "${word}". Please check spelling and try again.`);
    }
  }

  // Attach phonetics audio if available
  const audio = await fetchDictionaryAudio(normalized);
  if (audio) {
    result.audioUrl = audio;
  }

  return result;
}

export function getActiveProviderName(): string {
  const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  if (openRouterKey) {
    const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    return `OpenRouter (${model})`;
  }
  if (process.env.ANTHROPIC_API_KEY) return 'Claude API';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'Gemini API';
  return 'Free Dictionary & Curated Dataset';
}
