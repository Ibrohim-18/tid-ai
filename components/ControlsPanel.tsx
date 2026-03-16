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
  isApplyingKashidaSlow: boolean;
  onAddSticker: (src: string) => void;
  onStickerUpload: (src: string) => void;
  userStickers: string[];
  onRemoveUserSticker: (src: string) => void;
}

const inputClass = 'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.06)] outline-none transition duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-200/60';
const selectClass = `${inputClass} appearance-none`;
const cardClass = 'rounded-2xl border border-slate-200/70 bg-white/65 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)]';
const uploadClass = 'w-full block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600';

const Popover: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => (
  <div className="absolute top-full left-1/2 z-20 mt-3 w-[calc(100vw-24px)] max-w-[390px] -translate-x-1/2 rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur-2xl shadow-[0_24px_80px_rgba(15,23,42,0.22)]" onClick={(e) => e.stopPropagation()}>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold tracking-tight text-slate-800">{title}</h3>
      <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-400 shadow-sm transition hover:bg-slate-900 hover:text-white" aria-label="Close panel">
        &times;
      </button>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const ToolbarButton: React.FC<{ onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; isActive: boolean; children: React.ReactNode }> = ({ onClick, isActive, children }) => (
  <button onClick={onClick} className={`rounded-2xl px-3.5 py-2 text-sm font-medium tracking-tight transition-all duration-200 ${isActive ? 'bg-slate-900 text-white shadow-[0_12px_30px_rgba(15,23,42,0.22)]' : 'bg-white/70 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-white hover:text-slate-900'}`}>
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
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-[24px] border border-white/60 bg-white/65 p-2.5 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:gap-2">
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('text'); }} isActive={activeMenu === 'text'}>Text & AI</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('fonts'); }} isActive={activeMenu === 'fonts'}>Fonts</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('stickers'); }} isActive={activeMenu === 'stickers'}>Stickers</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('style'); }} isActive={activeMenu === 'style'}>Style</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('bg'); }} isActive={activeMenu === 'bg'}>Background</ToolbarButton>

            <div className="flex gap-1 rounded-2xl bg-white/70 p-1 shadow-sm">
              <button onClick={() => props.onLanguageChange(Language.RU)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${props.language === Language.RU ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>RU</button>
              <button onClick={() => props.onLanguageChange(Language.EN)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${props.language === Language.EN ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>EN</button>
            </div>

            <div className="flex gap-1.5">
              <button onClick={() => props.onDownload('png')} className="rounded-2xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(5,150,105,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-700">PNG</button>
              <button onClick={() => props.onDownload('jpeg')} className="rounded-2xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(5,150,105,0.25)] transition hover:-translate-y-0.5 hover:bg-emerald-700">JPEG</button>
            </div>
          </div>

          {activeMenu === 'text' && (
            <Popover title="Text & AI" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Ayah</label>
                  <textarea className={`${inputClass} min-h-[92px] resize-y text-lg`} style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }} value={props.ayah.text} onChange={(e) => props.setAyah((a) => ({ ...a, text: e.target.value, position: { ...a.position, x: -1 } }))} />
                  <button onClick={props.onApplyKashida} disabled={props.isApplyingKashida || !props.ayah.text.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(79,70,229,0.35)] transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none">
                    {props.isApplyingKashida && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />}
                    {props.isApplyingKashida ? 'Adding Kashida...' : 'Enhance with Kashida'}
                  </button>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {props.isApplyingKashida
                      ? props.isApplyingKashidaSlow
                        ? 'Still working — Arabic styling can take a little longer for AI processing.'
                        : 'Applying calligraphic elongation...'
                      : 'One tap adds calligraphic elongation while keeping the original Arabic text.'}
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Translation</label>
                  <textarea className={`${inputClass} min-h-[92px] resize-y`} value={props.translation.text} onChange={(e) => props.setTranslation((t) => ({ ...t, text: e.target.value, position: { ...t.position, x: -1 } }))} />
                  <button onClick={props.onHighlight} disabled={props.isHighlighting} className="mt-3 w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-amber-950 shadow-[0_14px_30px_rgba(251,191,36,0.25)] transition hover:-translate-y-0.5 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none">
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
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Ayah Font</label>
                  <select value={props.ayah.font} onChange={(e) => props.setAyah((a) => ({ ...a, font: e.target.value }))} className={selectClass}>
                    {props.arabicFonts.map((f) => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Translation Font</label>
                  <select value={props.translation.font} onChange={(e) => props.setTranslation((t) => ({ ...t, font: e.target.value }))} className={selectClass}>
                    {props.translationFonts.map((f) => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-600">Custom Fonts</label>
                  <div className={`${cardClass} mb-2 max-h-32 space-y-2 overflow-y-auto`}>
                    {props.customFonts.length > 0 ? props.customFonts.map((font) => (
                      <div key={font.familyName} className="flex items-center justify-between rounded-2xl bg-slate-100/90 p-2.5 text-sm shadow-sm">
                        <span className="truncate" title={font.name}>{font.name}</span>
                        <button onClick={() => props.onRemoveCustomFont(font.familyName)} className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-slate-400 transition hover:bg-red-50 hover:text-red-500" title={`Remove ${font.name}`}>
                          &times;
                        </button>
                      </div>
                    )) : <p className="py-2 text-center text-xs text-slate-500">No custom fonts.</p>}
                  </div>
                  <label htmlFor="fontUpload" className={uploadClass}>Upload Font</label>
                  <input type="file" id="fontUpload" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontFileChange} />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'stickers' && (
            <Popover title="Stickers" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div className={`${cardClass} grid max-h-48 grid-cols-4 gap-3 overflow-y-auto`}>
                  {props.userStickers.length > 0 ? props.userStickers.map((stickerSrc, index) => (
                    <div key={index} className="relative group aspect-square">
                      <button onClick={() => props.onAddSticker(stickerSrc)} className="h-full w-full rounded-2xl bg-white p-1.5 shadow-sm transition hover:-translate-y-0.5 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400" title="Add this sticker to canvas">
                        <img src={stickerSrc} alt={`User sticker ${index + 1}`} className="w-full h-full object-contain" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); props.onRemoveUserSticker(stickerSrc); }} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white opacity-0 transition-opacity hover:bg-red-600 focus:opacity-100 focus:outline-none group-hover:opacity-100" aria-label="Delete sticker" title="Delete sticker">
                        &times;
                      </button>
                    </div>
                  )) : (
                    <div className="col-span-4 py-4 text-center text-sm text-slate-500">Your uploaded stickers will appear here.</div>
                  )}
                </div>
                <div>
                  <label htmlFor="stickerUpload" className={uploadClass}>Upload New Sticker</label>
                  <input type="file" id="stickerUpload" accept="image/*" className="hidden" onChange={handleStickerFileChange} />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'style' && (
            <Popover title="Text Styling" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between text-sm font-medium text-slate-600">Ayah Size <span>{props.ayah.size}px</span></label>
                  <input type="range" min="16" max="80" value={props.ayah.size} onChange={(e) => props.setAyah((a) => ({ ...a, size: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-slate-600">Translation Size <span>{props.translation.size}px</span></label>
                  <input type="range" min="8" max="40" value={props.translation.size} onChange={(e) => props.setTranslation((t) => ({ ...t, size: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <div className={`${cardClass} flex items-center justify-between gap-4`}>
                  <label htmlFor="textColor" className="text-sm font-medium text-slate-600">Text Color</label>
                  <input type="color" id="textColor" value={props.textColor} onChange={(e) => props.setTextColor(e.target.value)} className="w-10 h-10 border-none bg-transparent" />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'bg' && (
            <Popover title="Background" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div className={`${cardClass} flex items-center justify-between gap-4`}>
                  <label htmlFor="bgColor" className="text-sm font-medium text-slate-600">Background Color</label>
                  <input type="color" id="bgColor" value={props.bgColor} onChange={(e) => props.setBgColor(e.target.value)} className="w-10 h-10 border-none bg-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => props.setBackgroundMode(BackgroundMode.GRADIENT)} className={`rounded-2xl p-3 text-sm font-semibold transition ${props.backgroundMode === BackgroundMode.GRADIENT ? 'bg-indigo-600 text-white shadow-[0_12px_24px_rgba(79,70,229,0.22)]' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>Gradient</button>
                  <button onClick={() => props.setBackgroundMode(BackgroundMode.TRANSPARENT)} className={`rounded-2xl p-3 text-sm font-semibold transition ${props.backgroundMode === BackgroundMode.TRANSPARENT ? 'bg-indigo-600 text-white shadow-[0_12px_24px_rgba(79,70,229,0.22)]' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>Transparent</button>
                </div>
                {props.backgroundMode !== BackgroundMode.SOLID && <button onClick={() => props.setBackgroundMode(BackgroundMode.SOLID)} className="mt-2 w-full rounded-2xl bg-white p-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Use Solid Color</button>}
              </div>
            </Popover>
          )}
        </div>
      </header>
    </>
  );
};

export default ControlsPanel;