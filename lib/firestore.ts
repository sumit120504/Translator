import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { WordEntry, WordStatus } from './types';

const COLLECTION_NAME = 'words';

// Local fallback storage path
const DATA_DIR = path.join(process.cwd(), '.data');
const LOCAL_STORAGE_FILE = path.join(DATA_DIR, 'words.json');

// In-memory cache
let cache: { words: WordEntry[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

export function isFirestoreConfigured(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    (process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY)
  );
}

function getFirestoreDb() {
  if (!isFirestoreConfigured()) {
    return null;
  }

  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (serviceAccountJson) {
      try {
        const parsed = JSON.parse(serviceAccountJson);
        initializeApp({ credential: cert(parsed) });
      } catch {
        const decoded = Buffer.from(serviceAccountJson, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        initializeApp({ credential: cert(parsed) });
      }
    } else if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
  }

  return getFirestore();
}

// ---------------- LOCAL STORAGE FALLBACK HELPERS ----------------

function ensureLocalDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_STORAGE_FILE)) {
    const initialSeed: WordEntry[] = [
      {
        id: 'resilient',
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
        id: 'serendipity',
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

// ---------------- FIRESTORE OPERATIONS ----------------

export async function getAllWords(forceFresh = false): Promise<WordEntry[]> {
  if (!forceFresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.words;
  }

  const db = getFirestoreDb();
  if (!db) {
    const local = readLocalWords();
    cache = { words: local, timestamp: Date.now() };
    return local;
  }

  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const words: WordEntry[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        word: String(data.word || doc.id).toLowerCase().trim(),
        part_of_speech: String(data.part_of_speech || ''),
        hindi_translation: String(data.hindi_translation || ''),
        english_meaning: String(data.english_meaning || ''),
        hindi_meaning: String(data.hindi_meaning || ''),
        example_sentence: String(data.example_sentence || ''),
        status: (data.status || 'new') as WordStatus,
        lookup_count: Number(data.lookup_count || 1),
        date_added: String(data.date_added || ''),
        last_viewed: String(data.last_viewed || ''),
      };
    });

    // Sort by date_added descending by default
    words.sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));

    cache = { words, timestamp: Date.now() };
    return words;
  } catch (error) {
    console.error('Error fetching from Firestore, falling back to local:', error);
    const local = readLocalWords();
    return local;
  }
}

export async function findWord(wordToFind: string): Promise<WordEntry | null> {
  const normalized = wordToFind.toLowerCase().trim();
  const db = getFirestoreDb();

  if (!db) {
    const allWords = await getAllWords();
    return allWords.find((item) => item.word === normalized) || null;
  }

  try {
    // Check doc by normalized ID first
    const docRef = db.collection(COLLECTION_NAME).doc(normalized);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data()!;
      return {
        id: docSnap.id,
        word: String(data.word || docSnap.id).toLowerCase().trim(),
        part_of_speech: String(data.part_of_speech || ''),
        hindi_translation: String(data.hindi_translation || ''),
        english_meaning: String(data.english_meaning || ''),
        hindi_meaning: String(data.hindi_meaning || ''),
        example_sentence: String(data.example_sentence || ''),
        status: (data.status || 'new') as WordStatus,
        lookup_count: Number(data.lookup_count || 1),
        date_added: String(data.date_added || ''),
        last_viewed: String(data.last_viewed || ''),
      };
    }

    // Secondary search by field in case ID differs
    const querySnap = await db
      .collection(COLLECTION_NAME)
      .where('word', '==', normalized)
      .limit(1)
      .get();

    if (!querySnap.empty) {
      const doc = querySnap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        word: String(data.word || doc.id).toLowerCase().trim(),
        part_of_speech: String(data.part_of_speech || ''),
        hindi_translation: String(data.hindi_translation || ''),
        english_meaning: String(data.english_meaning || ''),
        hindi_meaning: String(data.hindi_meaning || ''),
        example_sentence: String(data.example_sentence || ''),
        status: (data.status || 'new') as WordStatus,
        lookup_count: Number(data.lookup_count || 1),
        date_added: String(data.date_added || ''),
        last_viewed: String(data.last_viewed || ''),
      };
    }

    return null;
  } catch (err) {
    console.error('Error finding word in Firestore:', err);
    const allWords = await getAllWords();
    return allWords.find((item) => item.word === normalized) || null;
  }
}

export async function saveWord(
  newWord: Omit<WordEntry, 'id' | 'lookup_count' | 'date_added' | 'last_viewed' | 'status'>
): Promise<WordEntry> {
  const today = new Date().toISOString().split('T')[0];
  const normalized = newWord.word.toLowerCase().trim();
  const db = getFirestoreDb();

  const entry: WordEntry = {
    id: normalized,
    word: normalized,
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

  if (!db) {
    const allWords = await getAllWords(true);
    const filtered = allWords.filter((w) => w.word !== normalized);
    writeLocalWords([entry, ...filtered]);
    return entry;
  }

  try {
    const docRef = db.collection(COLLECTION_NAME).doc(normalized);
    await docRef.set({
      word: entry.word,
      part_of_speech: entry.part_of_speech,
      hindi_translation: entry.hindi_translation,
      english_meaning: entry.english_meaning,
      hindi_meaning: entry.hindi_meaning,
      example_sentence: entry.example_sentence,
      status: entry.status,
      lookup_count: entry.lookup_count,
      date_added: entry.date_added,
      last_viewed: entry.last_viewed,
    });

    cache = null;
    return entry;
  } catch (error) {
    console.error('Failed to save to Firestore, writing to local fallback:', error);
    const allWords = await getAllWords(true);
    const filtered = allWords.filter((w) => w.word !== normalized);
    writeLocalWords([entry, ...filtered]);
    return entry;
  }
}

export async function incrementLookupCount(idOrWord: string): Promise<WordEntry | null> {
  const today = new Date().toISOString().split('T')[0];
  const normalized = idOrWord.toLowerCase().trim();
  const db = getFirestoreDb();

  if (!db) {
    const allWords = await getAllWords(true);
    const index = allWords.findIndex((w) => w.id === idOrWord || w.word === normalized);
    if (index === -1) return null;
    const target = allWords[index];
    target.lookup_count = (target.lookup_count || 1) + 1;
    target.last_viewed = today;
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }

  try {
    let docRef = db.collection(COLLECTION_NAME).doc(normalized);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection(COLLECTION_NAME).doc(idOrWord);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      const qSnap = await db
        .collection(COLLECTION_NAME)
        .where('word', '==', normalized)
        .limit(1)
        .get();
      if (!qSnap.empty) {
        docRef = qSnap.docs[0].ref;
        docSnap = qSnap.docs[0];
      } else {
        return null;
      }
    }

    const data = docSnap.data()!;
    const newCount = (Number(data.lookup_count) || 1) + 1;

    await docRef.update({
      lookup_count: FieldValue.increment(1),
      last_viewed: today,
    });

    cache = null;
    return {
      id: docRef.id,
      word: String(data.word || docRef.id),
      part_of_speech: String(data.part_of_speech || ''),
      hindi_translation: String(data.hindi_translation || ''),
      english_meaning: String(data.english_meaning || ''),
      hindi_meaning: String(data.hindi_meaning || ''),
      example_sentence: String(data.example_sentence || ''),
      status: (data.status || 'new') as WordStatus,
      lookup_count: newCount,
      date_added: String(data.date_added || ''),
      last_viewed: today,
    };
  } catch (error) {
    console.error('Error incrementing lookup count in Firestore:', error);
    const allWords = await getAllWords(true);
    const index = allWords.findIndex((w) => w.id === idOrWord || w.word === normalized);
    if (index === -1) return null;
    const target = allWords[index];
    target.lookup_count = (target.lookup_count || 1) + 1;
    target.last_viewed = today;
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }
}

export async function updateWordStatus(
  idOrWord: string,
  status: WordStatus
): Promise<WordEntry | null> {
  const normalized = idOrWord.toLowerCase().trim();
  const db = getFirestoreDb();

  if (!db) {
    const allWords = await getAllWords(true);
    const index = allWords.findIndex((w) => w.id === idOrWord || w.word === normalized);
    if (index === -1) return null;
    const target = allWords[index];
    target.status = status;
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }

  try {
    let docRef = db.collection(COLLECTION_NAME).doc(normalized);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection(COLLECTION_NAME).doc(idOrWord);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      const qSnap = await db
        .collection(COLLECTION_NAME)
        .where('word', '==', normalized)
        .limit(1)
        .get();
      if (!qSnap.empty) {
        docRef = qSnap.docs[0].ref;
        docSnap = qSnap.docs[0];
      } else {
        return null;
      }
    }

    await docRef.update({ status });
    cache = null;

    const data = docSnap.data()!;
    return {
      id: docRef.id,
      word: String(data.word || docRef.id),
      part_of_speech: String(data.part_of_speech || ''),
      hindi_translation: String(data.hindi_translation || ''),
      english_meaning: String(data.english_meaning || ''),
      hindi_meaning: String(data.hindi_meaning || ''),
      example_sentence: String(data.example_sentence || ''),
      status,
      lookup_count: Number(data.lookup_count || 1),
      date_added: String(data.date_added || ''),
      last_viewed: String(data.last_viewed || ''),
    };
  } catch (error) {
    console.error('Error updating status in Firestore:', error);
    const allWords = await getAllWords(true);
    const index = allWords.findIndex((w) => w.id === idOrWord || w.word === normalized);
    if (index === -1) return null;
    const target = allWords[index];
    target.status = status;
    allWords[index] = target;
    writeLocalWords(allWords);
    return target;
  }
}

export async function deleteWord(idOrWord: string): Promise<boolean> {
  const normalized = idOrWord.toLowerCase().trim();
  const db = getFirestoreDb();

  if (!db) {
    const allWords = await getAllWords(true);
    const updated = allWords.filter((w) => w.id !== idOrWord && w.word !== normalized);
    writeLocalWords(updated);
    return true;
  }

  try {
    let docRef = db.collection(COLLECTION_NAME).doc(normalized);
    let docSnap = await docRef.get();

    if (!docSnap.exists) {
      docRef = db.collection(COLLECTION_NAME).doc(idOrWord);
      docSnap = await docRef.get();
    }

    if (!docSnap.exists) {
      const qSnap = await db
        .collection(COLLECTION_NAME)
        .where('word', '==', normalized)
        .limit(1)
        .get();
      if (!qSnap.empty) {
        docRef = qSnap.docs[0].ref;
      } else {
        return false;
      }
    }

    await docRef.delete();
    cache = null;
    return true;
  } catch (error) {
    console.error('Error deleting word from Firestore:', error);
    const allWords = await getAllWords(true);
    const updated = allWords.filter((w) => w.id !== idOrWord && w.word !== normalized);
    writeLocalWords(updated);
    return true;
  }
}
