import React, { useRef, useState, useEffect } from 'react';
import type { TextElement, CustomFont } from '../types';
import { Language, BackgroundMode } from '../types';

interface FontOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ControlsPanelProps {
  ayah: TextElement;
  setAyah: React.Dispatch<React.SetStateAction<TextElement>>;
  translation: TextElement;
  setTranslation: React.Dispatch<React.SetStateAction<TextElement>>;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  backgroundMode: BackgroundMode;
  setBackgroundMode: (mode: BackgroundMode) => void;
  customFonts: CustomFont[];
  onFontUpload: (file: File) => void;
  onRemoveCustomFont: (familyName: string) => void;
  arabicFonts: FontOption[];
  translationFonts: FontOption[];
  onDownload: (format: 'png' | 'jpeg') => void;
  onHighlight: () => void;
  isHighlighting: boolean;
  onApplyKashida: () => void;
  isApplyingKashida: boolean;
  onAddSticker: (src: string) => void;
  onStickerUpload: (src: string) => void;
  userStickers: string[];
  onRemoveUserSticker: (src: string) => void;
}

const Popover: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => (
  <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-[360px] bg-white/90 backdrop-blur-lg rounded-xl p-5 shadow-2xl z-20" onClick={(e) => e.stopPropagation()}>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-800 font-bold text-2xl" aria-label="Close panel">
        &times;
      </button>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const ToolbarButton: React.FC<{ onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; isActive: boolean; children: React.ReactNode }> = ({ onClick, isActive, children }) => (
  <button onClick={onClick} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-indigo-600 text-white shadow' : 'bg-white/50 hover:bg-white/80'}`}>
    {children}
  </button>
);

const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleInteractionOutside = (e: MouseEvent | TouchEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };

    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleInteractionOutside);
    document.addEventListener('touchstart', handleInteractionOutside);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('mousedown', handleInteractionOutside);
      document.removeEventListener('touchstart', handleInteractionOutside);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu((prev) => (prev === menu ? null : menu));
  };

  const handleFontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      props.onFontUpload(file);
      e.target.value = '';
    }
  };

  const handleStickerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        props.onStickerUpload(event.target?.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  return (
    <>
      <header className="flex fixed top-4 left-1/2 -translate-x-1/2 z-10 w-full px-4 justify-center">
        <div ref={controlsRef} className="relative">
          <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 bg-white/60 backdrop-blur-lg rounded-xl p-2 shadow-xl">
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('text'); }} isActive={activeMenu === 'text'}>Text & AI</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('fonts'); }} isActive={activeMenu === 'fonts'}>Fonts</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('stickers'); }} isActive={activeMenu === 'stickers'}>Stickers</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('style'); }} isActive={activeMenu === 'style'}>Style</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('bg'); }} isActive={activeMenu === 'bg'}>Background</ToolbarButton>

            <div className="flex gap-1 bg-white/50 rounded-md p-1">
              <button onClick={() => props.onLanguageChange(Language.RU)} className={`px-2 py-1 text-xs rounded transition ${props.language === Language.RU ? 'bg-indigo-600 text-white shadow' : 'hover:bg-gray-200'}`}>RU</button>
              <button onClick={() => props.onLanguageChange(Language.EN)} className={`px-2 py-1 text-xs rounded transition ${props.language === Language.EN ? 'bg-indigo-600 text-white shadow' : 'hover:bg-gray-200'}`}>EN</button>
            </div>

            <div className="flex gap-1">
              <button onClick={() => props.onDownload('png')} className="px-3 py-2 text-sm bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 transition">PNG</button>
              <button onClick={() => props.onDownload('jpeg')} className="px-3 py-2 text-sm bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700 transition">JPEG</button>
            </div>
          </div>

          {activeMenu === 'text' && (
            <Popover title="Text & AI" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ayah</label>
                  <textarea className="w-full p-2 bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 transition duration-200 resize-y min-h-[70px] text-lg" style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }} value={props.ayah.text} onChange={(e) => props.setAyah((a) => ({ ...a, text: e.target.value, position: { ...a.position, x: -1 } }))} />
                  <button onClick={props.onApplyKashida} disabled={props.isApplyingKashida || !props.ayah.text.trim()} className="w-full mt-2 py-2 px-4 text-sm bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-300 disabled:cursor-not-allowed">
                    {props.isApplyingKashida ? 'Applying...' : 'Enhance with Kashida'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Translation</label>
                  <textarea className="w-full p-2 bg-white text-gray-900 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500 transition duration-200 resize-y min-h-[70px]" value={props.translation.text} onChange={(e) => props.setTranslation((t) => ({ ...t, text: e.target.value, position: { ...t.position, x: -1 } }))} />
                  <button onClick={props.onHighlight} disabled={props.isHighlighting} className="w-full mt-2 py-2 px-4 text-sm bg-yellow-400 text-yellow-900 font-semibold rounded-lg shadow-md hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-300 disabled:cursor-not-allowed">
                    {props.isHighlighting ? 'Analyzing...' : 'Highlight Key Words'}
                  </button>
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'fonts' && (
            <Popover title="Fonts" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Ayah Font</label>
                  <select value={props.ayah.font} onChange={(e) => props.setAyah((a) => ({ ...a, font: e.target.value }))} className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white">
                    {props.arabicFonts.map((f) => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Translation Font</label>
                  <select value={props.translation.font} onChange={(e) => props.setTranslation((t) => ({ ...t, font: e.target.value }))} className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white">
                    {props.translationFonts.map((f) => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Custom Fonts</label>
                  <div className="p-2 bg-gray-50 rounded-lg space-y-2 max-h-32 overflow-y-auto mb-2 border">
                    {props.customFonts.length > 0 ? props.customFonts.map((font) => (
                      <div key={font.familyName} className="flex justify-between items-center text-sm bg-gray-200/70 p-2 rounded">
                        <span className="truncate" title={font.name}>{font.name}</span>
                        <button onClick={() => props.onRemoveCustomFont(font.familyName)} className="text-gray-400 hover:text-red-500 font-bold text-xl ml-2 focus:outline-none flex-shrink-0" title={`Remove ${font.name}`}>
                          &times;
                        </button>
                      </div>
                    )) : <p className="text-xs text-gray-500 text-center py-2">No custom fonts.</p>}
                  </div>
                  <label htmlFor="fontUpload" className="w-full block text-center p-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition text-sm">Upload Font</label>
                  <input type="file" id="fontUpload" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontFileChange} />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'stickers' && (
            <Popover title="Stickers" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 p-2 bg-gray-50 rounded-lg max-h-48 overflow-y-auto border">
                  {props.userStickers.length > 0 ? props.userStickers.map((stickerSrc, index) => (
                    <div key={index} className="relative group aspect-square">
                      <button onClick={() => props.onAddSticker(stickerSrc)} className="w-full h-full bg-white rounded-md p-1 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition shadow-sm" title="Add this sticker to canvas">
                        <img src={stickerSrc} alt={`User sticker ${index + 1}`} className="w-full h-full object-contain" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); props.onRemoveUserSticker(stickerSrc); }} className="absolute top-0 right-0 -mt-1 -mr-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:opacity-100 focus:outline-none" aria-label="Delete sticker" title="Delete sticker">
                        &times;
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-4 text-center text-sm text-gray-500 py-4">Your uploaded stickers will appear here.</div>
                  )}
                </div>
                <div>
                  <label htmlFor="stickerUpload" className="w-full block text-center p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition text-sm">Upload New Sticker</label>
                  <input type="file" id="stickerUpload" accept="image/*" className="hidden" onChange={handleStickerFileChange} />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'style' && (
            <Popover title="Text Styling" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-sm font-medium text-gray-600">Ayah Size <span>{props.ayah.size}px</span></label>
                  <input type="range" min="16" max="80" value={props.ayah.size} onChange={(e) => props.setAyah((a) => ({ ...a, size: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-gray-600">Translation Size <span>{props.translation.size}px</span></label>
                  <input type="range" min="8" max="40" value={props.translation.size} onChange={(e) => props.setTranslation((t) => ({ ...t, size: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <div className="flex items-center justify-between gap-4 p-2 bg-white rounded-lg border">
                  <label htmlFor="textColor" className="text-sm font-medium text-gray-600">Text Color</label>
                  <input type="color" id="textColor" value={props.textColor} onChange={(e) => props.setTextColor(e.target.value)} className="w-10 h-10 border-none bg-transparent" />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'bg' && (
            <Popover title="Background" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-2 bg-white rounded-lg border">
                  <label htmlFor="bgColor" className="text-sm font-medium text-gray-600">Background Color</label>
                  <input type="color" id="bgColor" value={props.bgColor} onChange={(e) => props.setBgColor(e.target.value)} className="w-10 h-10 border-none bg-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => props.setBackgroundMode(BackgroundMode.GRADIENT)} className={`p-3 rounded-lg transition text-sm font-semibold ${props.backgroundMode === BackgroundMode.GRADIENT ? 'bg-indigo-600 text-white shadow' : 'bg-white hover:bg-gray-200'}`}>Gradient</button>
                  <button onClick={() => props.setBackgroundMode(BackgroundMode.TRANSPARENT)} className={`p-3 rounded-lg transition text-sm font-semibold ${props.backgroundMode === BackgroundMode.TRANSPARENT ? 'bg-indigo-600 text-white shadow' : 'bg-white hover:bg-gray-200'}`}>Transparent</button>
                </div>
                {props.backgroundMode !== BackgroundMode.SOLID && <button onClick={() => props.setBackgroundMode(BackgroundMode.SOLID)} className="w-full mt-2 p-3 rounded-lg transition bg-white hover:bg-gray-200 text-sm font-semibold">Use Solid Color</button>}
              </div>
            </Popover>
          )}
        </div>
      </header>
    </>
  );
};

export default ControlsPanel;