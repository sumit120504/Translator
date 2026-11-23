import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { TranslationResult } from './types';
import { validateTranslationResult } from './validate';

// Default model to use on OpenRouter (fast, cost-effective, high quality)
export const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini';

// Resilient fallback models on OpenRouter
const OPENROUTER_FALLBACK_MODELS = [
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'deepseek/deepseek-chat',
  'meta-llama/llama-3.3-70b-instruct',
];

// Curated high quality dictionary for common lookups
const CURATED_DICTIONARY: Record<string, TranslationResult> = {
  book: {
    word: 'book',
    partOfSpeech: 'noun',
    hindiTranslation: ['किताब', 'पुस्तक'],
    englishMeaning: 'A written or printed work consisting of pages glued or sewn together along one side and bound in covers.',
    hindiMeaning: 'कागज़ों या पन्नों का वह संग्रह जो एक जिल्द में बंधा होता है और जिसमें ज्ञान, कहानियाँ या जानकारी दर्ज होती है।',
    example: 'She sat by the window reading an interesting book.',
  },
  jargon: {
    word: 'jargon',
    partOfSpeech: 'noun',
    hindiTranslation: ['तकनीकी शब्दावली', 'पारिभाषिक शब्द', 'विशिष्ट भाषा'],
    englishMeaning: 'Special words or expressions used by a particular profession or group that are difficult for others to understand.',
    hindiMeaning: 'किसी विशेष पेशे, समूह या क्षेत्र में उपयोग किए जाने वाले ऐसे तकनीकी शब्द जो आम लोगों के लिए समझना कठिन होते हैं।',
    example: 'The legal document was full of technical jargon that confused the client.',
  },
  resilient: {
    word: 'resilient',
    partOfSpeech: 'adjective',
    hindiTranslation: ['लचीला', 'सहनशील', 'दृढ़'],
    englishMeaning: 'Able to withstand or recover quickly from difficult conditions.',
    hindiMeaning: 'कठिनाइयों, तनाव या संकट से जल्दी उबरने और पुनः सामान्य स्थिति में आने में सक्षम।',
    example: 'He is a resilient person who never gives up during tough times.',
  },
  serendipity: {
    word: 'serendipity',
    partOfSpeech: 'noun',
    hindiTranslation: ['सौभाग्य', 'आकस्मिक लाभ', 'सुखद संयोग'],
    englishMeaning: 'The occurrence and development of events by chance in a happy or beneficial way.',
    hindiMeaning: 'संयोगवश किसी सुखद, अप्रत्याशित या लाभकारी वस्तु अथवा घटना का मिल जाना।',
    example: 'Discovering this wonderful bookstore was pure serendipity.',
  },
  ephemeral: {
    word: 'ephemeral',
    partOfSpeech: 'adjective',
    hindiTranslation: ['क्षणभंगुर', 'अल्पकालिक'],
    englishMeaning: 'Lasting for a very short time; transitory.',
    hindiMeaning: 'जो बहुत थोड़े समय के लिए रहे या शीघ्र ही समाप्त हो जाए।',
    example: 'The beauty of spring cherry blossoms is ephemeral.',
  },
  ubiquitous: {
    word: 'ubiquitous',
    partOfSpeech: 'adjective',
    hindiTranslation: ['सर्वव्यापी', 'सर्वत्र उपस्थित'],
    englishMeaning: 'Present, appearing, or found everywhere at the same time.',
    hindiMeaning: 'जो हर जगह उपस्थित या एक ही समय में सभी स्थानों पर पाया जाने वाला हो।',
    example: 'Smartphones have become ubiquitous in modern daily life.',
  },
  run: {
    word: 'run',
    partOfSpeech: 'verb',
    hindiTranslation: ['दौड़ना', 'भागना', 'चलाना'],
    englishMeaning: 'Move at a speed faster than a walk, never having both feet on the ground at the same time.',
    hindiMeaning: 'पैरों से तेज़ गति से आगे बढ़ना अथवा किसी यंत्र या व्यवसाय को संचालित करना।',
    example: 'He runs five kilometers every morning to stay healthy.',
  },
  love: {
    word: 'love',
    partOfSpeech: 'noun / verb',
    hindiTranslation: ['प्रेम', 'प्यार', 'स्नेह'],
    englishMeaning: 'An intense feeling of deep affection and care for someone or something.',
    hindiMeaning: 'किसी के प्रति अत्यधिक गहरा स्नेह, लगाव, आत्मीयता या सम्मान का भाव।',
    example: 'Their love and dedication to their family is inspiring.',
  },
  compassion: {
    word: 'compassion',
    partOfSpeech: 'noun',
    hindiTranslation: ['करुणा', 'सहानुभूति', 'दया'],
    englishMeaning: 'Sympathetic pity and concern for the sufferings or misfortunes of others.',
    hindiMeaning: 'दूसरों के कष्ट या पीड़ा को देखकर मन में उत्पन्न होने वाली गहरी दया और उनकी सहायता करने की भावना।',
    example: 'The nurse treated all patients with warmth and deep compassion.',
  },
  perseverance: {
    word: 'perseverance',
    partOfSpeech: 'noun',
    hindiTranslation: ['दृढ़ता', 'लगन', 'अध्यवसाय'],
    englishMeaning: 'Persistence in doing something despite difficulty or delay in achieving success.',
    hindiMeaning: 'कठिनाइयों और बाधाओं के बावजूद अपने लक्ष्य की प्राप्ति के लिए निरंतर प्रयास करते रहने का गुण।',
    example: 'Her perseverance finally led to her graduation with top honors.',
  },
};

/**
 * Checks whether an entry has a low-quality formulaic/boilerplate definition
 */
export function isBoilerplateDefinition(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  return (
    lower.includes('relating to or denoting') ||
    text.includes('से संबंधित या उसका सूचक') ||
    text.includes('से संबंधित अर्थ या विवरण')
  );
}

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
 * Translate using OpenRouter API with multi-model fallback and strict no-boilerplate instructions
 */
async function translateWithOpenRouter(
  word: string,
  apiKey: string,
  userModel?: string
): Promise<TranslationResult> {
  // Models to attempt in order
  const modelQueue: string[] = [];
  if (userModel && userModel !== 'anthropic/claude-3.5-sonnet') {
    modelQueue.push(userModel);
  }
  for (const m of OPENROUTER_FALLBACK_MODELS) {
    if (!modelQueue.includes(m)) {
      modelQueue.push(m);
    }
  }

  const systemPrompt = `You are an expert bilingual lexicographer specializing in English and Hindi.
Given an English word, provide:
1. part of speech (noun, verb, adjective, adverb, etc.)
2. 2-3 accurate, common Hindi translations (in Devanagari script)
3. clear, precise English definition explaining the actual meaning (do NOT write "Relating to or denoting...")
4. Hindi meaning/definition: write a rich, natural explanation completely in Hindi Devanagari script explaining the concept clearly in 1-2 sentences. NEVER use robotic template phrases like "...से संबंधित या उसका सूचक" or "...का अर्थ है...".
5. a natural example sentence in English.

Return ONLY a valid JSON object with exactly this schema:
{
  "word": "word",
  "partOfSpeech": "part of speech",
  "hindiTranslation": ["अनुवाद 1", "अनुवाद 2"],
  "englishMeaning": "Clear English definition",
  "hindiMeaning": "हिंदी में सरल और संपूर्ण अर्थ",
  "example": "A clear, natural example sentence in English"
}`;

  let lastError: any = null;

  for (const currentModel of modelQueue) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://wordlearner.app',
          'X-Title': 'WordLearner',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: currentModel,
          max_tokens: 700,
          temperature: 0.1,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Define and translate the English word: "${word}"` },
          ],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`OpenRouter model ${currentModel} returned ${res.status}: ${errorText.slice(0, 150)}`);
        lastError = new Error(`OpenRouter (${currentModel}): ${errorText.slice(0, 150)}`);
        continue; // Try next model in queue
      }

      const data = await res.json();
      const rawContent = data.choices?.[0]?.message?.content;
      if (!rawContent) continue;

      let cleaned = rawContent.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (validateTranslationResult(parsed)) {
        return parsed;
      }
    } catch (err) {
      console.warn(`Error with OpenRouter model ${currentModel}:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('All OpenRouter models failed to respond.');
}

/**
 * Translate using Claude API (Anthropic)
 */
async function translateWithClaude(word: string, apiKey: string): Promise<TranslationResult> {
  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are an expert bilingual lexicographer specializing in English and Hindi.
Given an English word, provide:
1. part of speech
2. 2-3 accurate Hindi translations (Devanagari script)
3. clear, simple English definition (no generic templates like "relating to...")
4. Hindi meaning/definition: natural, fluent Hindi explanation (Devanagari) explaining the concept clearly. Do NOT use boilerplate like "से संबंधित या उसका सूचक".
5. a natural example sentence in English.

Return ONLY a valid JSON object with this schema:
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
  "hindiMeaning": "हिंदी में सरल, स्वाभाविक और सटीक अर्थ (Devanagari)",
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
 * Fallback translation using Free APIs (Datamuse + Free Dictionary + MyMemory) without generic boilerplate
 */
async function translateWithFreeServices(word: string): Promise<TranslationResult> {
  const normalized = word.toLowerCase().trim();
  if (CURATED_DICTIONARY[normalized]) {
    return CURATED_DICTIONARY[normalized];
  }

  let definition = '';
  let partOfSpeech = 'noun';
  let example = `He used the word "${word}" in conversation.`;

  // Source 1: Free Dictionary API
  try {
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (dictRes.ok) {
      const dictData = await dictRes.json();
      if (Array.isArray(dictData) && dictData[0]?.meanings?.length > 0) {
        for (const m of dictData[0].meanings) {
          if (m.definitions?.length > 0 && m.definitions[0]?.definition) {
            definition = m.definitions[0].definition;
            partOfSpeech = m.partOfSpeech || 'noun';
            if (m.definitions[0].example) {
              example = m.definitions[0].example;
            }
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Free dictionary lookup failed:', err);
  }

  // Source 2: Datamuse API dictionary definition fallback if Source 1 failed
  if (!definition) {
    try {
      const datamuseRes = await fetch(
        `https://api.datamuse.com/words?sp=${encodeURIComponent(word)}&md=d&max=1`
      );
      if (datamuseRes.ok) {
        const datamuseData = await datamuseRes.json();
        if (Array.isArray(datamuseData) && datamuseData[0]?.defs?.length > 0) {
          const rawDef = datamuseData[0].defs[0]; // e.g. "n\ta special language..."
          const parts = rawDef.split('\t');
          if (parts.length > 1) {
            const posTag = parts[0];
            definition = parts[1];
            if (posTag === 'n') partOfSpeech = 'noun';
            else if (posTag === 'v') partOfSpeech = 'verb';
            else if (posTag === 'adj') partOfSpeech = 'adjective';
            else if (posTag === 'adv') partOfSpeech = 'adverb';
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // Source 3: Hindi Translation via MyMemory
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
  } catch {
    // Ignore
  }

  if (hindiTranslations.length === 0) {
    hindiTranslations = [word];
  }

  // Source 4: Translate definition to Hindi
  let hindiMeaning = '';
  if (definition) {
    try {
      const defTransRes = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(definition)}&langpair=en|hi`
      );
      if (defTransRes.ok) {
        const defTransData = await defTransRes.json();
        const defTranslation = defTransData?.responseData?.translatedText;
        if (defTranslation && !defTranslation.includes('MYMEMORY') && !isBoilerplateDefinition(defTranslation)) {
          hindiMeaning = defTranslation;
        }
      }
    } catch {
      // Ignore
    }
  }

  // If definition is still empty, provide clean meaningful text rather than boilerplate
  if (!definition) {
    definition = `The word "${word}" typically refers to ${hindiTranslations.join(' या ')}.`;
  }
  if (!hindiMeaning) {
    hindiMeaning = `अंग्रेजी शब्द "${word}" का अर्थ "${hindiTranslations[0]}" होता है।`;
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

  // 2. Try OpenRouter API (Recommended)
  if ((preferredProvider === 'openrouter' || preferredProvider === 'auto') && openRouterKey) {
    try {
      result = await translateWithOpenRouter(
        normalized,
        openRouterKey,
        process.env.OPENROUTER_MODEL
      );
    } catch (err) {
      console.warn('OpenRouter translation error, falling back to next provider:', err);
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

  // 5. Free services fallback (Free Dictionary API + Datamuse + MyMemory)
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
    const model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
    return `OpenRouter (${model})`;
  }
  if (process.env.ANTHROPIC_API_KEY) return 'Claude API';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'Gemini API';
  return 'Free Dictionary & Curated Dataset';
}
