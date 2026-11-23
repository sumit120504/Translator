export type WordStatus = 'new' | 'learning' | 'learned';

export interface WordEntry {
  id: string;
  word: string;
  part_of_speech: string;
  hindi_translation: string; // e.g. "लचीला, सहनशील"
  english_meaning: string;
  hindi_meaning: string;
  example_sentence: string;
  status: WordStatus;
  lookup_count: number;
  date_added: string;
  last_viewed: string;
  audio_url?: string;
}

export interface LookupResponse {
  id?: string;
  word: string;
  partOfSpeech: string;
  hindiTranslation: string[];
  englishMeaning: string;
  hindiMeaning: string;
  example: string;
  saved: boolean;
  fromCache: boolean;
  lookupCount?: number;
  status?: WordStatus;
  audioUrl?: string;
}

export interface TranslationResult {
  word: string;
  partOfSpeech: string;
  hindiTranslation: string[];
  englishMeaning: string;
  hindiMeaning: string;
  example: string;
  audioUrl?: string;
}

export interface StorageStatus {
  firestoreConfigured: boolean;
  sheetsConfigured?: boolean;
  aiConfigured: boolean;
  activeProvider: string;
  mode: 'firebase-firestore' | 'local-fallback';
  totalWords: number;
}
