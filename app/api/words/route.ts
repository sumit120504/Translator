import { NextRequest, NextResponse } from 'next/server';
import { getAllWords, saveWord } from '@/lib/firestore';
import { WordStatus } from '@/lib/types';
import { validateWordInput } from '@/lib/validate';
import { getWordTranslation } from '@/lib/translate';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.toLowerCase().trim() || '';
    const statusFilter = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'newest';

    const allWords = await getAllWords();

    // Compute stats
    const stats = {
      total: allWords.length,
      new: allWords.filter((w) => w.status === 'new').length,
      learning: allWords.filter((w) => w.status === 'learning').length,
      learned: allWords.filter((w) => w.status === 'learned').length,
    };

    let filtered = [...allWords];

    // Filter by search query
    if (query) {
      filtered = filtered.filter(
        (w) =>
          w.word.toLowerCase().includes(query) ||
          w.hindi_translation.toLowerCase().includes(query) ||
          w.english_meaning.toLowerCase().includes(query) ||
          w.hindi_meaning.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((w) => w.status === statusFilter);
    }

    // Sort words
    switch (sort) {
      case 'oldest':
        filtered.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
        break;
      case 'alpha':
        filtered.sort((a, b) => a.word.localeCompare(b.word));
        break;
      case 'lookups':
        filtered.sort((a, b) => (b.lookup_count || 1) - (a.lookup_count || 1));
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
        break;
    }

    return NextResponse.json({
      words: filtered,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching words:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve saved words.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { word } = body;

    const validation = validateWordInput(word);
    if (!validation.valid || !validation.normalized) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const translation = await getWordTranslation(validation.normalized);
    const saved = await saveWord({
      word: translation.word,
      part_of_speech: translation.partOfSpeech,
      hindi_translation: translation.hindiTranslation.join(', '),
      english_meaning: translation.englishMeaning,
      hindi_meaning: translation.hindiMeaning,
      example_sentence: translation.example,
    });

    return NextResponse.json({ success: true, word: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save word.' }, { status: 500 });
  }
}
