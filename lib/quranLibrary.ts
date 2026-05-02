import { Language } from '../types';

export interface QuranVerse {
  id: number;
  text: string;
  translation: string;
}

export interface QuranChapter {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: string;
  total_verses: number;
  verses: QuranVerse[];
}

const quranCache = new Map<Language, Promise<QuranChapter[]>>();

const getQuranDataUrl = (language: Language): string => (
  language === Language.RU ? '/quran/quran_ru.json' : '/quran/quran_en.json'
);

export const loadQuranLibrary = (language: Language): Promise<QuranChapter[]> => {
  if (!quranCache.has(language)) {
    quranCache.set(
      language,
      fetch(getQuranDataUrl(language))
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load Quran data: ${response.status}`);
          }

          return response.json() as Promise<QuranChapter[]>;
        })
    );
  }

  return quranCache.get(language)!;
};
