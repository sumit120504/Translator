import { NextRequest, NextResponse } from 'next/server';
import { validateWordInput } from '@/lib/validate';
import { findWord, incrementLookupCount, saveWord } from '@/lib/sheets';
import { getWordTranslation } from '@/lib/translate';
import { LookupResponse } from '@/lib/types';

// Rate limiting map (in-memory, simple IP based limit: 30 requests/min per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 });
    return false;
  }

  if (entry.count >= 40) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before searching again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { word } = body;

    const validation = validateWordInput(word);
    if (!validation.valid || !validation.normalized) {
      return NextResponse.json(
        { error: validation.error || 'Invalid word input.' },
        { status: 400 }
      );
    }

    const normalized = validation.normalized;

    // Step 1: Check if word is already saved in Sheet/storage
    const existing = await findWord(normalized);
    if (existing) {
      // Increment lookup counter
      const updated = await incrementLookupCount(existing.id);
      const hindiList = existing.hindi_translation
        ? existing.hindi_translation.split(',').map((s) => s.trim())
        : [];

      const response: LookupResponse = {
        id: existing.id,
        word: existing.word,
        partOfSpeech: existing.part_of_speech,
        hindiTranslation: hindiList,
        englishMeaning: existing.english_meaning,
        hindiMeaning: existing.hindi_meaning,
        example: existing.example_sentence,
        saved: true,
        fromCache: true,
        lookupCount: updated?.lookup_count || existing.lookup_count,
        status: existing.status,
      };

      return NextResponse.json(response);
    }

    // Step 2: Fetch translation & definitions
    const translationResult = await getWordTranslation(normalized);

    // Step 3: Save new entry to Sheet/storage
    const savedEntry = await saveWord({
      word: translationResult.word,
      part_of_speech: translationResult.partOfSpeech,
      hindi_translation: translationResult.hindiTranslation.join(', '),
      english_meaning: translationResult.englishMeaning,
      hindi_meaning: translationResult.hindiMeaning,
      example_sentence: translationResult.example,
    });

    const response: LookupResponse = {
      id: savedEntry.id,
      word: savedEntry.word,
      partOfSpeech: savedEntry.part_of_speech,
      hindiTranslation: translationResult.hindiTranslation,
      englishMeaning: savedEntry.english_meaning,
      hindiMeaning: savedEntry.hindi_meaning,
      example: savedEntry.example_sentence,
      saved: true,
      fromCache: false,
      lookupCount: savedEntry.lookup_count,
      status: savedEntry.status,
      audioUrl: translationResult.audioUrl,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Lookup API error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred while looking up the word.' },
      { status: 500 }
    );
  }
}
