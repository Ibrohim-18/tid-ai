import React, { useState, useCallback, useRef, useEffect, useMemo, useReducer } from 'react';
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

interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
  pendingHistoryBase: AppState | null;
}

type HistoryAction =
  | { type: 'APPLY'; updater: (state: AppState) => AppState; recordHistory?: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' };

type UpdateOptions = {
  recordHistory?: boolean;
};

type TextElementSetter = (updater: React.SetStateAction<TextElement>, options?: UpdateOptions) => void;

const HISTORY_LIMIT = 40;

const ARABIC_DIACRITICS_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;
const ARABIC_BASE_LETTER_REGEX = /[\u0621-\u064A]/;
const STRETCHABLE_ARABIC_LETTERS = new Set(['ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'ي']);
const NON_CONNECTING_ARABIC_LETTERS = new Set(['ا', 'أ', 'إ', 'آ', 'د', 'ذ', 'ر', 'ز', 'و', 'ؤ', 'ء']);

const areStatesEqual = (a: AppState, b: AppState): boolean => JSON.stringify(a) === JSON.stringify(b);

const areTextElementsEqual = (a: TextElement, b: TextElement): boolean => (
  a.text === b.text
  && a.font === b.font
  && a.size === b.size
  && a.position.x === b.position.x
  && a.position.y === b.position.y
);

const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
  switch (action.type) {
    case 'APPLY': {
      const next = action.updater(state.present);

      if (action.recordHistory === false) {
        if (next === state.present) {
          return state;
        }

        return {
          ...state,
          present: next,
          pendingHistoryBase: state.pendingHistoryBase ?? state.present,
        };
      }

      const baseState = state.pendingHistoryBase ?? state.present;

      if (next === state.present) {
        if (!state.pendingHistoryBase) {
          return state;
        }

        if (areStatesEqual(baseState, state.present)) {
          return {
            ...state,
            pendingHistoryBase: null,
          };
        }

        return {
          past: [...state.past.slice(-(HISTORY_LIMIT - 1)), baseState],
          present: state.present,
          future: [],
          pendingHistoryBase: null,
        };
      }

      if (areStatesEqual(baseState, next)) {
        return {
          ...state,
          present: next,
          pendingHistoryBase: null,
        };
      }

      return {
        past: [...state.past.slice(-(HISTORY_LIMIT - 1)), baseState],
        present: next,
        future: [],
        pendingHistoryBase: null,
      };
    }
    case 'UNDO': {
      if (state.past.length === 0) {
        return {
          ...state,
          pendingHistoryBase: null,
        };
      }

      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        pendingHistoryBase: null,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) {
        return {
          ...state,
          pendingHistoryBase: null,
        };
      }

      const [next, ...restFuture] = state.future;
      return {
        past: [...state.past.slice(-(HISTORY_LIMIT - 1)), state.present],
        present: next,
        future: restFuture,
        pendingHistoryBase: null,
      };
    }
    default:
      return state;
  }
};

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
  const [historyState, dispatchHistory] = useReducer(historyReducer, undefined, (): HistoryState => {
    const defaultState = getInitialDefaultState();

    try {
      const savedState = localStorage.getItem('ayahVerseEditorState_v2');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.ayah && parsed.translation) {
          return {
            past: [],
            present: { ...defaultState, ...parsed },
            future: [],
            pendingHistoryBase: null,
          };
        }
      }
    } catch (error) {
      console.error('Failed to load state from localStorage', error);
    }

    return {
      past: [],
      present: defaultState,
      future: [],
      pendingHistoryBase: null,
    };
  });

  const appState = historyState.present;
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [isApplyingKashida, setIsApplyingKashida] = useState(false);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const canUndo = historyState.past.length > 0;
  const canRedo = historyState.future.length > 0;

  const updateAppState = useCallback((updater: (state: AppState) => AppState, options?: UpdateOptions) => {
    dispatchHistory({ type: 'APPLY', updater, recordHistory: options?.recordHistory });
  }, []);

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

  const setAyah = useCallback<TextElementSetter>((updater, options) => {
    updateAppState((s) => {
      const nextAyah = typeof updater === 'function' ? updater(s.ayah) : updater;
      return areTextElementsEqual(s.ayah, nextAyah) ? s : { ...s, ayah: nextAyah };
    }, options);
  }, [updateAppState]);

  const setTranslation = useCallback<TextElementSetter>((updater, options) => {
    updateAppState((s) => {
      const nextTranslation = typeof updater === 'function' ? updater(s.translation) : updater;
      return areTextElementsEqual(s.translation, nextTranslation) ? s : { ...s, translation: nextTranslation };
    }, options);
  }, [updateAppState]);

  const handleLanguageChange = useCallback((lang: Language) => {
    updateAppState((s) => {
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
  }, [updateAppState]);

  const setTextColor = useCallback((color: string) => updateAppState((s) => (s.textColor === color ? s : { ...s, textColor: color })), [updateAppState]);
  const setBgColor = useCallback((color: string) => updateAppState((s) => (s.bgColor === color ? s : { ...s, bgColor: color })), [updateAppState]);
  const setBackgroundMode = useCallback((mode: BackgroundMode) => updateAppState((s) => (s.backgroundMode === mode ? s : { ...s, backgroundMode: mode })), [updateAppState]);
  const setHighlightedWords = useCallback((words: string[]) => updateAppState((s) => (JSON.stringify(s.highlightedWords) === JSON.stringify(words) ? s : { ...s, highlightedWords: words })), [updateAppState]);

  const handleFontUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const fontUrl = event.target?.result as string;
      const newFont: CustomFont = {
        name: file.name,
        url: fontUrl,
        familyName: `custom_${file.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
      };

      updateAppState((s) => ({
        ...s,
        customFonts: [...s.customFonts, newFont],
      }));
    };
    reader.readAsDataURL(file);
  }, [updateAppState]);

  const handleRemoveCustomFont = useCallback((familyName: string) => {
    updateAppState((s) => {
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
  }, [updateAppState]);

  const handleHighlightWords = useCallback(async () => {
    if (!appState.translation.text) return;

    setIsHighlighting(true);
    updateAppState((s) => ({ ...s, highlightedWords: [] }), { recordHistory: false });

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
        updateAppState((s) => ({ ...s, highlightedWords: words.map(String) }));
      }
    } catch (error) {
      console.error('Error highlighting words:', error);
    } finally {
      setIsHighlighting(false);
    }
  }, [appState.translation.text, updateAppState]);

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

      updateAppState((s) => ({
        ...s,
        stickers: [...s.stickers, newSticker],
      }));
      setActiveElementId(newSticker.id);
    };
    img.src = src;
  }, [appState.stickers, updateAppState]);

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

      updateAppState((s) => {
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
  }, [updateAppState]);

  const handleUpdateSticker = useCallback((id: string, newProps: Partial<StickerElement>, options?: UpdateOptions) => {
    updateAppState((s) => {
      const nextStickers = s.stickers.map((sticker) => {
        if (sticker.id !== id) return sticker;

        const updatedSticker: StickerElement = {
          ...sticker,
          ...newProps,
          position: newProps.position ?? sticker.position,
        };

        return JSON.stringify(updatedSticker) === JSON.stringify(sticker) ? sticker : updatedSticker;
      });

      return nextStickers === s.stickers || nextStickers.every((sticker, index) => sticker === s.stickers[index])
        ? s
        : { ...s, stickers: nextStickers };
    }, options);
  }, [updateAppState]);

  const handleRemoveSticker = useCallback((id: string) => {
    updateAppState((s) => ({
      ...s,
      stickers: s.stickers.filter((sticker) => sticker.id !== id),
    }));
    setActiveElementId(null);
  }, [updateAppState]);

  const handleRemoveUserSticker = useCallback((stickerSrc: string) => {
    const activeStickerIsBeingDeleted = appState.stickers.some((sticker) => sticker.id === activeElementId && sticker.src === stickerSrc);
    if (activeStickerIsBeingDeleted) {
      setActiveElementId(null);
    }

    updateAppState((s) => ({
      ...s,
      userStickers: s.userStickers.filter((src) => src !== stickerSrc),
      stickers: s.stickers.filter((sticker) => sticker.src !== stickerSrc),
    }));
  }, [appState.stickers, activeElementId, updateAppState]);

  const handleSelectSticker = useCallback((id: string) => {
    setActiveElementId(id);
    updateAppState((s) => {
      const maxZIndex = Math.max(0, ...s.stickers.map((st) => st.zIndex));
      return {
        ...s,
        stickers: s.stickers.map((sticker) => (sticker.id === id ? { ...sticker, zIndex: maxZIndex + 1 } : sticker)),
      };
    }, { recordHistory: false });
  }, [updateAppState]);

  const handleUndo = useCallback(() => {
    setActiveElementId(null);
    dispatchHistory({ type: 'UNDO' });
  }, []);

  const handleRedo = useCallback(() => {
    setActiveElementId(null);
    dispatchHistory({ type: 'REDO' });
  }, []);

  const handleDownloadImage = useCallback((format: 'png' | 'jpeg') => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    setActiveElementId(null);
    canvasElement.classList.add('exporting');

    const isTransparentPreviewExport = appState.backgroundMode === BackgroundMode.TRANSPARENT;
    if (isTransparentPreviewExport) {
      canvasElement.classList.add('exporting-transparent');
    }

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
          canvasElement.classList.remove('exporting-transparent');
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
          canvasElement.classList.remove('exporting-transparent');
        });
    }, 100);
  }, [appState.backgroundMode, appState.bgColor]);

  const customFontOptions = useMemo(() => appState.customFonts.map((f) => ({ value: f.familyName, label: f.name })), [appState.customFonts]);
  const combinedArabicFonts = useMemo(() => [...ARABIC_FONTS, { value: 'separator', label: '--- Custom Fonts ---', disabled: true }, ...customFontOptions], [customFontOptions]);
  const combinedTranslationFonts = useMemo(() => [...TRANSLATION_FONTS, { value: 'separator', label: '--- Custom Fonts ---', disabled: true }, ...customFontOptions], [customFontOptions]);

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
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
      <style>{`
        @font-face {
          font-family: 'King Fahad Complex';
          src: url('https://fonts.qurancomplex.gov.sa/wp-content/uploads/2020/07/KFC-v2-Uthman-Taha-Naskh-Regular.otf') format('opentype');
        }
        #canvas.exporting { border: none !important; }
        #canvas.exporting.exporting-transparent {
          background-image: none !important;
          box-shadow: none !important;
        }
        #canvas.exporting .draggable-text-wrapper { transform: none !important; }
        #canvas.exporting .sticker-control, #canvas.exporting .sticker-border { display: none !important; }
        .highlight { color: rgba(255,255,255,0.84); font-weight: 600; text-shadow: 0 1px 8px rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
};

export default App;