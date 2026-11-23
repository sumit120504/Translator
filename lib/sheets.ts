import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { WordEntry, WordStatus } from './types';

const SHEET_NAME = 'Words';
const HEADERS = [
  'id',
  'word',
  'part_of_speech',
  'hindi_translation',
  'english_meaning',
  'hindi_meaning',
  'example_sentence',
  'status',
  'lookup_count',
  'date_added',
  'last_viewed',
];

// Local fallback storage path
const DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_STORAGE_FILE = path.join(DATA_DIR, 'words.json');

// In-memory cache to respect Sheets API quotas
let cache: { words: WordEntry[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export function isGoogleSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error('Google Service Account credentials missing.');
  }

  // Handle escaped newlines in environment variable
  privateKey = privateKey.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// ---------------- LOCAL STORAGE FALLBACK HELPERS ----------------

function ensureLocalDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORAGE_FILE)) {
    // Initial sample seed so the app feels alive immediately
    const initialSeed: WordEntry[] = [
      {
        id: '1',
        word: 'resilient',
        part_of_speech: 'adjective',
        hindi_translation: 'लचीला, सहनशील',
        english_meaning: 'Able to recover quickly from difficulties.',
        hindi_meaning: 'कठिनाइयों से जल्दी उबरने में सक्षम।',
        example_sentence: 'She remained resilient in the face of adversity.',
        status: 'learning',
        lookup_count: 2,
        date_added: new Date().toISOString().split('T')[0],
        last_viewed: new Date().toISOString().split('T')[0],
      },
      {
        id: '2',
        word: 'serendipity',
        part_of_speech: 'noun',
        hindi_translation: 'सौभाग्य, आकस्मिक लाभ',
        english_meaning: 'The occurrence of events by chance in a happy or beneficial way.',
        hindi_meaning: 'संयोग से किसी सुखद या लाभकारी वस्तु का मिल जाना।',
        example_sentence: 'Meeting my old friend in Paris was pure serendipity.',
        status: 'new',
        lookup_count: 1,
        date_added: new Date().toISOString().split('T')[0],
        last_viewed: new Date().toISOString().split('T')[0],
      },
    ];
    fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(initialSeed, null, 2), 'utf-8');
  }
}

function readLocalWords(): WordEntry[] {
  ensureLocalDirectory();
  try {
    const raw = fs.readFileSync(LOCAL_STORAGE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLocalWords(words: WordEntry[]): void {
  ensureLocalDirectory();
  fs.writeFileSync(LOCAL_STORAGE_FILE, JSON.stringify(words, null, 2), 'utf-8');
  cache = { words, timestamp: Date.now() };
}

// ---------------- GOOGLE SHEETS API OPERATIONS ----------------

async function ensureSheetStructure(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetExists = meta.data.sheets?.some(
      (s: any) => s.properties?.title === SHEET_NAME
    );

    if (!sheetExists) {
      // Create the sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: SHEET_NAME },
              },
            },
          ],
        },
      });
    }

    // Check if header row exists
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A1:K1`,
    });

    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEET_NAME}!A1:K1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [HEADERS] },
      });
    }
  } catch (err) {
    console.warn('Could not auto-initialize sheet structure:', err);
  }
}

export async function getAllWords(forceFresh = false): Promise<WordEntry[]> {
  // Check memory cache first
  if (!forceFresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.words;
  }

  if (!isGoogleSheetsConfigured()) {
    const local = readLocalWords();
    cache = { words: local, timestamp: Date.now() };
    return local;
  }

  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    await ensureSheetStructure(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!A2:K`,
    });

    const rows = response.data.values || [];
    const words: WordEntry[] = rows.map((row: any[]) => ({
      id: String(row[0] || ''),
      word: String(row[1] || '').toLowerCase().trim(),
      part_of_speech: String(row[2] || ''),
      hindi_translation: String(row[3] || ''),
      english_meaning: String(row[4] || ''),
      hindi_meaning: String(row[5] || ''),
      example_sentence: String(row[6] || ''),
      status: (row[7] || 'new') as WordStatus,
      lookup_count: Number(row[8] || 1),
      date_added: String(row[9] || ''),
      last_viewed: String(row[10] || ''),
    })).filter((w) => !!w.word);

    cache = { words, timestamp: Date.now() };
    return words;
  } catch (error) {
    console.error('Error fetching from Google Sheets, falling back to local:', error);
    const local = readLocalWords();
    return local;
  }
}

export async function findWord(wordToFind: string): Promise<WordEntry | null> {
  const normalized = wordToFind.toLowerCase().trim();
  const allWords = await getAllWords();
  return allWords.find((item) => item.word === normalized) || null;
}

export async function saveWord(
  newWord: Omit<WordEntry, 'id' | 'lookup_count' | 'date_added' | 'last_viewed' | 'status'>
): Promise<WordEntry> {
  const today = new Date().toISOString().split('T')[0];
  const allWords = await getAllWords(true);

  // Generate incremental ID
  const nextId = (
    allWords.reduce((max, w) => Math.max(max, parseInt(w.id, 10) || 0), 0) + 1
  ).toString();

  const entry: WordEntry = {
    id: nextId,
    word: newWord.word.toLowerCase().trim(),
    part_of_speech: newWord.part_of_speech,
    hindi_translation: newWord.hindi_translation,
    english_meaning: newWord.english_meaning,
    hindi_meaning: newWord.hindi_meaning,
    example_sentence: newWord.example_sentence,
    status: 'new',
    lookup_count: 1,
    date_added: today,
    last_viewed: today,
  };

  if (!isGoogleSheetsConfigured()) {
    const updated = [entry, ...allWords];
    writeLocalWords(updated);
    return entry;
  }

  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    const rowValues = [
      entry.id,
      entry.word,
      entry.part_of_speech,
      entry.hindi_translation,
      entry.english_meaning,
      entry.hindi_meaning,
      entry.example_sentence,
      entry.status,
      entry.lookup_count,
      entry.date_added,
      entry.last_viewed,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAME}!A:K`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [rowValues] },
    });

    // Invalidate cache
    cache = null;
    return entry;
  } catch (error) {
    console.error('Failed to append to Google Sheets, saving to local fallback:', error);
    const updated = [entry, ...allWords];
    writeLocalWords(updated);
    return entry;
  }
}

export async function incrementLookupCount(id: string): Promise<WordEntry | null> {
  const today = new Date().toISOString().split('T')[0];
  const allWords = await getAllWords(true);
  const index = allWords.findIndex((w) => w.id === id);

  if (index === -1) return null;

  const target = allWords[index];
  target.lookup_count = (target.lookup_count || 1) + 1;
  target.last_viewed = today;

  if (!isGoogleSheetsConfigured()) {
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }

  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // In Sheets, row 1 is header, so row index in sheet is index + 2
    const sheetRowNumber = index + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!I${sheetRowNumber}:K${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[target.lookup_count, target.date_added, target.last_viewed]],
      },
    });

    cache = null;
    return target;
  } catch (error) {
    console.error('Error updating lookup count in Sheets, saving locally:', error);
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }
}

export async function updateWordStatus(id: string, status: WordStatus): Promise<WordEntry | null> {
  const allWords = await getAllWords(true);
  const index = allWords.findIndex((w) => w.id === id);

  if (index === -1) return null;

  const target = allWords[index];
  target.status = status;

  if (!isGoogleSheetsConfigured()) {
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }

  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    const sheetRowNumber = index + 2;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!H${sheetRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status]],
      },
    });

    cache = null;
    return target;
  } catch (error) {
    console.error('Error updating status in Sheets:', error);
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }
}

export async function deleteWord(id: string): Promise<boolean> {
  const allWords = await getAllWords(true);
  const index = allWords.findIndex((w) => w.id === id);

  if (index === -1) return false;

  if (!isGoogleSheetsConfigured()) {
    const updated = allWords.filter((w) => w.id !== id);
    writeLocalWords(updated);
    return true;
  }

  try {
    const sheets = getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

    // Find the sheetId for 'Words' sheet
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetObj = meta.data.sheets?.find(
      (s: any) => s.properties?.title === SHEET_NAME
    );
    const sheetId = sheetObj?.properties?.sheetId || 0;

    // Row index is 0-based for batchUpdate: row 1 is index 0, row 2 is index 1...
    const rowIndex = index + 1; // because index 0 is row 2, which is sheet 0-indexed row 1

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          },
        ],
      },
    });

    cache = null;
    return true;
  } catch (error) {
    console.error('Error deleting from Sheets, removing from local fallback:', error);
    const updated = allWords.filter((w) => w.id !== id);
    writeLocalWords(updated);
    return true;
  }
}
