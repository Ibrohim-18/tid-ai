import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { TextElement, CustomFont, StickerElement } from './types';
import { Language, BackgroundMode } from './types';
import ControlsPanel from './components/ControlsPanel';
import CanvasArea from './components/CanvasArea';
import { ARABIC_FONTS, TRANSLATION_FONTS } from './constants';

interface AppState {
  ayah: TextElement;
  translation: TextElement;
  language: Language;
  textColor: string;
  bgColor: string;
  backgroundMode: BackgroundMode;
  customFonts: CustomFont[];
  highlightedWords: string[];
  stickers: StickerElement[];
  userStickers: string[];
}

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;
const ARABIC_BASE_LETTER_REGEX = /[\u0621-\u064A]/;
const STRETCHABLE_ARABIC_LETTERS = new Set(['ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي']);
const NON_CONNECTING_ARABIC_LETTERS = new Set(['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ء']);

const getInitialDefaultState = (): AppState => {
  const isMobile = window.innerWidth < 768;

  return {
    ayah: {
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      font: "'King Fahad Complex', serif",
      size: isMobile ? 30 : 48,
      position: { x: -1, y: 150 },
    },
    translation: {
      text: 'In the name of Allah, the Most Gracious, the Most Merciful',
      font: "'Inter', sans-serif",
      size: isMobile ? 9 : 14,
      position: { x: -1, y: 230 },
    },
    language: Language.EN,
    textColor: '#ffffff',
    bgColor: '#000000',
    backgroundMode: BackgroundMode.SOLID,
    customFonts: [],
    highlightedWords: [],
    stickers: [],
    userStickers: [],
  };
};

const splitArabicGlyphs = (word: string): string[] => {
  const glyphs: string[] = [];

  for (const char of Array.from(word)) {
    if (ARABIC_DIACRITICS_REGEX.test(char) && glyphs.length > 0) {
      glyphs[glyphs.length - 1] += char;
    } else {
      glyphs.push(char);
    }
  }

  return glyphs;
};

const getBaseLetter = (glyph: string): string => {
  for (const char of Array.from(glyph)) {
    if (!ARABIC_DIACRITICS_REGEX.test(char) && char !== 'ـ') {
      return char;
    }
  }

  return '';
};

const getKashidaCandidateIndexes = (glyphs: string[]): number[] => {
  const candidates: number[] = [];

  for (let index = 0; index < glyphs.length - 1; index += 1) {
    const currentLetter = getBaseLetter(glyphs[index]);
    const nextLetter = getBaseLetter(glyphs[index + 1]);

    if (!ARABIC_BASE_LETTER_REGEX.test(currentLetter) || !ARABIC_BASE_LETTER_REGEX.test(nextLetter)) continue;
    if (!STRETCHABLE_ARABIC_LETTERS.has(currentLetter)) continue;
    if (NON_CONNECTING_ARABIC_LETTERS.has(nextLetter)) continue;
    if (index === 0 || index === glyphs.length - 2) continue;

    candidates.push(index);
  }

  return candidates;
};

const getPreferredKashidaOrder = (candidates: number[], glyphCount: number): number[] => {
  const center = (glyphCount - 1) / 2;

  return [...candidates].sort((a, b) => {
    const distanceDiff = Math.abs(a - center) - Math.abs(b - center);
    return distanceDiff !== 0 ? distanceDiff : a - b;
  });
};

const buildTatweelPlan = (candidateOrder: number[], totalTatweels: number): Map<number, number> => {
  const plan = new Map<number, number>();

  candidateOrder.forEach((index) => plan.set(index, 0));

  for (let step = 0; step < totalTatweels; step += 1) {
    const targetIndex = candidateOrder[step % candidateOrder.length];
    plan.set(targetIndex, (plan.get(targetIndex) ?? 0) + 1);
  }

  return plan;
};

const addFastKashidaToWord = (word: string): string => {
  const existingTatweels = (word.match(/ـ/g) ?? []).length;
  const normalizedWord = word.replace(/ـ+/g, '');
  const glyphs = splitArabicGlyphs(normalizedWord);
  if (glyphs.length < 4) return word;

  const candidates = getKashidaCandidateIndexes(glyphs);

  if (candidates.length === 0) {
    return word;
  }

  const stepSize = glyphs.length >= 8 ? 2 : 1;
  const targetTatweels = Math.min(existingTatweels + stepSize, candidates.length * 3);
  const tatweelPlan = buildTatweelPlan(getPreferredKashidaOrder(candidates, glyphs.length), targetTatweels);
  const stretchedGlyphs: string[] = [];

  glyphs.forEach((glyph, index) => {
    stretchedGlyphs.push(glyph);

    const tatweelsAfterGlyph = tatweelPlan.get(index) ?? 0;
    if (tatweelsAfterGlyph > 0) {
      stretchedGlyphs.push('ـ'.repeat(tatweelsAfterGlyph));
    }
  });

  return stretchedGlyphs.join('');
};

const applyFastKashida = (text: string): string => {
  return text
    .split(/(\s+)/)
    .map((token) => (ARABIC_BASE_LETTER_REGEX.test(token) ? addFastKashidaToWord(token) : token))
    .join('');
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    const defaultState = getInitialDefaultState();

    try {
      const savedState = localStorage.getItem('ayahVerseEditorState_v2');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.ayah && parsed.translation) {
          return { ...defaultState, ...parsed };
        }
      }
    } catch (error) {
      console.error('Failed to load state from localStorage', error);
    }

    return defaultState;
  });

  const [isHighlighting, setIsHighlighting] = useState(false);
  const [isApplyingKashida, setIsApplyingKashida] = useState(false);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('ayahVerseEditorState_v2', JSON.stringify(appState));
    } catch (error) {
      console.error('Failed to save state to localStorage', error);
    }
  }, [appState]);

  useEffect(() => {
    const styleId = 'custom-font-styles';
    let styleTag = document.getElementById(styleId);
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    const fontFaces = appState.customFonts
      .map(
        (font) => `
        @font-face {
            font-family: '${font.familyName}';
            src: url('${font.url}');
        }
    `
      )
      .join('\n');

    styleTag.textContent = fontFaces;
  }, [appState.customFonts]);

  const setAyah = useCallback((updater: React.SetStateAction<TextElement>) => {
    setAppState((s) => ({ ...s, ayah: typeof updater === 'function' ? updater(s.ayah) : updater }));
  }, []);

  const setTranslation = useCallback((updater: React.SetStateAction<TextElement>) => {
    setAppState((s) => ({ ...s, translation: typeof updater === 'function' ? updater(s.translation) : updater }));
  }, []);

  const handleLanguageChange = useCallback((lang: Language) => {
    setAppState((s) => {
      let newTranslationText = s.translation.text;

      if (lang === Language.EN && s.translation.text === 'Во имя Аллаха, Милостивого, Милосердного') {
        newTranslationText = 'In the name of Allah, the Most Gracious, the Most Merciful';
      } else if (lang === Language.RU && s.translation.text === 'In the name of Allah, the Most Gracious, the Most Merciful') {
        newTranslationText = 'Во имя Аллаха, Милостивого, Милосердного';
      }

      return {
        ...s,
        language: lang,
        highlightedWords: [],
        translation: { ...s.translation, text: newTranslationText },
      };
    });
  }, []);

  const setTextColor = useCallback((color: string) => setAppState((s) => ({ ...s, textColor: color })), []);
  const setBgColor = useCallback((color: string) => setAppState((s) => ({ ...s, bgColor: color })), []);
  const setBackgroundMode = useCallback((mode: BackgroundMode) => setAppState((s) => ({ ...s, backgroundMode: mode })), []);
  const setHighlightedWords = useCallback((words: string[]) => setAppState((s) => ({ ...s, highlightedWords: words })), []);

  const handleFontUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const fontUrl = event.target?.result as string;
      const newFont: CustomFont = {
        name: file.name,
        url: fontUrl,
        familyName: `custom_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      };

      setAppState((s) => ({
        ...s,
        customFonts: [...s.customFonts, newFont],
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleRemoveCustomFont = useCallback((familyName: string) => {
    setAppState((s) => {
      const newAyah = { ...s.ayah };
      if (newAyah.font === familyName) newAyah.font = ARABIC_FONTS[0].value;

      const newTranslation = { ...s.translation };
      if (newTranslation.font === familyName) newTranslation.font = TRANSLATION_FONTS[0].value;

      return {
        ...s,
        customFonts: s.customFonts.filter((f) => f.familyName !== familyName),
        ayah: newAyah,
        translation: newTranslation,
      };
    });
  }, []);

  const handleHighlightWords = useCallback(async () => {
    if (!appState.translation.text) return;

    setIsHighlighting(true);
    setAppState((s) => ({ ...s, highlightedWords: [] }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Identify the most theologically significant words in this religious verse translation. Return a JSON array containing these words as strings. The text is: "${appState.translation.text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
              description: 'A theologically significant word from the text.',
            },
          },
        },
      });

      const resultText = response.text.trim();
      const words = JSON.parse(resultText);
      if (Array.isArray(words)) {
        setAppState((s) => ({ ...s, highlightedWords: words.map(String) }));
      }
    } catch (error) {
      console.error('Error highlighting words:', error);
    } finally {
      setIsHighlighting(false);
    }
  }, [appState.translation.text]);

  const handleApplyKashida = useCallback(() => {
    if (!appState.ayah.text) return;

    setIsApplyingKashida(true);
    try {
      const newText = applyFastKashida(appState.ayah.text);
      if (newText && newText !== appState.ayah.text) {
        setAyah((a) => ({ ...a, text: newText, position: { ...a.position, x: -1 } }));
      }
    } finally {
      setIsApplyingKashida(false);
    }
  }, [appState.ayah.text, setAyah]);

  const handleAddSticker = useCallback((src: string) => {
    const img = new Image();
    img.onload = () => {
      const canvasWidth = canvasRef.current?.offsetWidth ?? 500;
      const canvasHeight = canvasRef.current?.offsetHeight ?? 500;
      const newSticker: StickerElement = {
        id: `sticker_${Date.now()}`,
        src,
        position: { x: (canvasWidth - 150) / 2, y: (canvasHeight - 150 * (img.naturalHeight / img.naturalWidth)) / 2 },
        width: 150,
        rotation: 0,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        zIndex: Math.max(0, ...appState.stickers.map((s) => s.zIndex)) + 1,
      };

      setAppState((s) => ({
        ...s,
        stickers: [...s.stickers, newSticker],
      }));
      setActiveElementId(newSticker.id);
    };
    img.src = src;
  }, [appState.stickers]);

  const handleStickerUpload = useCallback((src: string) => {
    const img = new Image();
    img.onload = () => {
      const canvasWidth = canvasRef.current?.offsetWidth ?? 500;
      const canvasHeight = canvasRef.current?.offsetHeight ?? 500;
      const newStickerId = `sticker_${Date.now()}`;

      const newSticker: StickerElement = {
        id: newStickerId,
        src,
        position: { x: (canvasWidth - 150) / 2, y: (canvasHeight - 150 * (img.naturalHeight / img.naturalWidth)) / 2 },
        width: 150,
        rotation: 0,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        zIndex: 0,
      };

      setAppState((s) => {
        const maxZIndex = Math.max(0, ...s.stickers.map((st) => st.zIndex)) + 1;
        const finalSticker = { ...newSticker, zIndex: maxZIndex };
        const newUserStickers = s.userStickers.includes(src) ? s.userStickers : [...s.userStickers, src];

        return {
          ...s,
          userStickers: newUserStickers,
          stickers: [...s.stickers, finalSticker],
        };
      });
      setActiveElementId(newStickerId);
    };
    img.src = src;
  }, []);

  const handleUpdateSticker = useCallback((id: string, newProps: Partial<StickerElement>) => {
    setAppState((s) => ({
      ...s,
      stickers: s.stickers.map((sticker) => (sticker.id === id ? { ...sticker, ...newProps } : sticker)),
    }));
  }, []);

  const handleRemoveSticker = useCallback((id: string) => {
    setAppState((s) => ({
      ...s,
      stickers: s.stickers.filter((sticker) => sticker.id !== id),
    }));
    setActiveElementId(null);
  }, []);

  const handleRemoveUserSticker = useCallback((stickerSrc: string) => {
    const activeStickerIsBeingDeleted = appState.stickers.some((sticker) => sticker.id === activeElementId && sticker.src === stickerSrc);
    if (activeStickerIsBeingDeleted) {
      setActiveElementId(null);
    }

    setAppState((s) => ({
      ...s,
      userStickers: s.userStickers.filter((src) => src !== stickerSrc),
      stickers: s.stickers.filter((sticker) => sticker.src !== stickerSrc),
    }));
  }, [appState.stickers, activeElementId]);

  const handleSelectSticker = useCallback((id: string) => {
    setActiveElementId(id);
    setAppState((s) => {
      const maxZIndex = Math.max(0, ...s.stickers.map((st) => st.zIndex));
      return {
        ...s,
        stickers: s.stickers.map((sticker) => (sticker.id === id ? { ...sticker, zIndex: maxZIndex + 1 } : sticker)),
      };
    });
  }, []);

  const handleDownloadImage = useCallback((format: 'png' | 'jpeg') => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    setActiveElementId(null);
    canvasElement.classList.add('exporting');

    const { width, height } = canvasElement.getBoundingClientRect();
    setTimeout(() => {
      // @ts-ignore
      html2canvas(canvasElement, {
        backgroundColor: appState.backgroundMode === BackgroundMode.TRANSPARENT ? null : appState.backgroundMode === BackgroundMode.GRADIENT ? '#667eea' : appState.bgColor,
        scale: 5,
        useCORS: true,
        width,
        height,
      })
        .then((canvas) => {
          canvasElement.classList.remove('exporting');
          const link = document.createElement('a');
          link.download = `ayah_${Date.now()}.${format}`;

          if (format === 'jpeg') {
            const jpegCanvas = document.createElement('canvas');
            jpegCanvas.width = canvas.width;
            jpegCanvas.height = canvas.height;
            const ctx = jpegCanvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = appState.backgroundMode === BackgroundMode.GRADIENT ? '#667eea' : appState.bgColor;
              ctx.fillRect(0, 0, jpegCanvas.width, jpegCanvas.height);
              ctx.drawImage(canvas, 0, 0);
              link.href = jpegCanvas.toDataURL('image/jpeg', 0.95);
            }
          } else {
            link.href = canvas.toDataURL('image/png');
          }

          link.click();
        })
        .catch((err) => {
          console.error('Failed to export image:', err);
          canvasElement.classList.remove('exporting');
        });
    }, 100);
  }, [appState.backgroundMode, appState.bgColor]);

  const customFontOptions = appState.customFonts.map((f) => ({ value: f.familyName, label: f.name }));
  const combinedArabicFonts = [...ARABIC_FONTS, { value: 'separator', label: '--- Custom Fonts ---', disabled: true }, ...customFontOptions];
  const combinedTranslationFonts = [...TRANSLATION_FONTS, { value: 'separator', label: '--- Custom Fonts ---', disabled: true }, ...customFontOptions];

  return (
    <div className="font-sans text-gray-800 w-screen h-[100svh] overflow-hidden bg-black">
      <CanvasArea
        ref={canvasRef}
        ayah={appState.ayah}
        setAyah={setAyah}
        translation={appState.translation}
        setTranslation={setTranslation}
        textColor={appState.textColor}
        bgColor={appState.bgColor}
        backgroundMode={appState.backgroundMode}
        highlightedWords={appState.highlightedWords}
        draggingElement={draggingElement}
        setDraggingElement={setDraggingElement}
        stickers={appState.stickers}
        onUpdateSticker={handleUpdateSticker}
        onRemoveSticker={handleRemoveSticker}
        activeElementId={activeElementId}
        setActiveElementId={setActiveElementId}
        onSelectSticker={handleSelectSticker}
      />
      <ControlsPanel
        ayah={appState.ayah}
        setAyah={setAyah}
        translation={appState.translation}
        setTranslation={setTranslation}
        language={appState.language}
        onLanguageChange={handleLanguageChange}
        textColor={appState.textColor}
        setTextColor={setTextColor}
        bgColor={appState.bgColor}
        setBgColor={setBgColor}
        backgroundMode={appState.backgroundMode}
        setBackgroundMode={setBackgroundMode}
        customFonts={appState.customFonts}
        onFontUpload={handleFontUpload}
        onRemoveCustomFont={handleRemoveCustomFont}
        arabicFonts={combinedArabicFonts}
        translationFonts={combinedTranslationFonts}
        onDownload={handleDownloadImage}
        onHighlight={handleHighlightWords}
        isHighlighting={isHighlighting}
        highlightedWords={appState.highlightedWords}
        setHighlightedWords={setHighlightedWords}
        onApplyKashida={handleApplyKashida}
        isApplyingKashida={isApplyingKashida}
        onAddSticker={handleAddSticker}
        onStickerUpload={handleStickerUpload}
        userStickers={appState.userStickers}
        onRemoveUserSticker={handleRemoveUserSticker}
      />
      <style>{`
        @font-face {
          font-family: 'King Fahad Complex';
          src: url('https://fonts.qurancomplex.gov.sa/wp-content/uploads/2020/07/KFC-v2-Uthman-Taha-Naskh-Regular.otf') format('opentype');
        }
        #canvas.exporting { border: none !important; }
        #canvas.exporting .draggable-text-wrapper { transform: none !important; }
        #canvas.exporting .sticker-control, #canvas.exporting .sticker-border { display: none !important; }
        .highlight { color: rgba(255,255,255,0.84); font-weight: 600; text-shadow: 0 1px 8px rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
};

export default App;