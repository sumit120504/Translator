import { NextResponse } from 'next/server';
import { isGoogleSheetsConfigured, getAllWords } from '@/lib/sheets';
import { getActiveProviderName } from '@/lib/translate';

export async function GET() {
  try {
    const sheetsOk = isGoogleSheetsConfigured();
    const words = await getAllWords();
    const provider = getActiveProviderName();
    const openRouterOk = !!(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY);

    return NextResponse.json({
      sheetsConfigured: sheetsOk,
      storageMode: sheetsOk ? 'Google Sheets' : 'Local Fallback (.data/words.json)',
      activeProvider: provider,
      openRouterConfigured: openRouterOk,
      openRouterModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
      sheetId: process.env.GOOGLE_SHEET_ID ? 'Configured' : 'Not configured',
      serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Not configured',
      totalWords: words.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error checking status' },
      { status: 500 }
    );
  }
}
