import { NextResponse } from 'next/server';
import { isFirestoreConfigured, getAllWords } from '@/lib/firestore';
import { getActiveProviderName } from '@/lib/translate';

export async function GET() {
  try {
    const firestoreOk = isFirestoreConfigured();
    const words = await getAllWords();
    const provider = getActiveProviderName();
    const openRouterOk = !!(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY);

    return NextResponse.json({
      firestoreConfigured: firestoreOk,
      storageMode: firestoreOk ? 'Firebase Firestore' : 'Local Fallback (.data/words.json)',
      activeProvider: provider,
      openRouterConfigured: openRouterOk,
      openRouterModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'Not configured',
      totalWords: words.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error checking status' },
      { status: 500 }
    );
  }
}
