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

  const handleApplyKashida = useCallback(async () => {
    if (!appState.ayah.text) return;

    setIsApplyingKashida(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Add Arabic kashida (tatweel, character: 'ـ') to the following Arabic text for a beautiful calligraphic effect. Only add kashidas where appropriate for elongation. Do not change or remove any original characters. The output should be only the modified text, with no extra explanations. Text: "${appState.ayah.text}"`,
      });
      const newText = response.text.trim();
      if (newText) {
        setAyah((a) => ({ ...a, text: newText, position: { ...a.position, x: -1 } }));
      }
    } catch (error) {
      console.error('Error applying kashida:', error);
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
        .highlight { color: #ffd700; }
      `}</style>
    </div>
  );
};

export default App;