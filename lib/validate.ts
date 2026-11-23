import { TranslationResult } from './types';

export interface ValidationResult {
  valid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes English input word or short phrase.
 */
export function validateWordInput(rawInput: unknown): ValidationResult {
  if (typeof rawInput !== 'string') {
    return { valid: false, error: 'Input must be a text string.' };
  }

  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { valid: false, error: 'Please enter an English word to look up.' };
  }

  if (trimmed.length > 45) {
    return { valid: false, error: 'Input is too long (maximum 45 characters).' };
  }

  // Check for Devanagari or other non-Latin alphabets
  // Devanagari unicode range: \u0900-\u097F
  if (/[\u0900-\u097F]/.test(trimmed)) {
    return { valid: false, error: 'Please enter an English word (Devanagari script detected).' };
  }

  // Allow English letters, spaces, hyphens, apostrophes (max 3 words for idioms/phrasal verbs)
  const words = trimmed.split(/\s+/);
  if (words.length > 3) {
    return { valid: false, error: 'Please enter a single word or a short idiom (up to 3 words).' };
  }

  // Check character set: only English letters, spaces, hyphens, apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return { valid: false, error: 'Please enter English letters only (no numbers or special symbols).' };
  }

  return {
    valid: true,
    normalized: trimmed.toLowerCase(),
  };
}

/**
 * Validates that an AI or dictionary translation result has all required fields.
 */
export function validateTranslationResult(data: any): data is TranslationResult {
  if (!data || typeof data !== 'object') return false;

  if (typeof data.word !== 'string' || !data.word.trim()) return false;
  if (typeof data.partOfSpeech !== 'string' || !data.partOfSpeech.trim()) return false;
  if (!Array.isArray(data.hindiTranslation) || data.hindiTranslation.length === 0) return false;
  if (typeof data.englishMeaning !== 'string' || !data.englishMeaning.trim()) return false;
  if (typeof data.hindiMeaning !== 'string' || !data.hindiMeaning.trim()) return false;
  if (typeof data.example !== 'string') return false;

  return true;
}
