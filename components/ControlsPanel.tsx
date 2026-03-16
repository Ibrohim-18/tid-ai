import React, { useRef, useState, useEffect } from 'react';
import { Download, Image, Languages, Palette, Sparkles, Type } from 'lucide-react';
import type { TextElement, CustomFont } from '../types';
import { Language, BackgroundMode } from '../types';
import { InputWithTags } from './ui/input-with-tags';
import { RainbowButton } from './ui/rainbow-button';

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
  highlightedWords: string[];
  setHighlightedWords: (words: string[]) => void;
  onApplyKashida: () => void;
  isApplyingKashida: boolean;
  onAddSticker: (src: string) => void;
  onStickerUpload: (src: string) => void;
  userStickers: string[];
  onRemoveUserSticker: (src: string) => void;
}

const inputClass = 'w-full rounded-[24px] border border-white/10 bg-[#111111c9] px-5 py-4 text-white shadow-[0_0_24px_rgba(0,0,0,0.18)] outline-none transition duration-200 placeholder:text-white/35 focus:border-white/20 focus:ring-4 focus:ring-white/10';
const selectClass = `${inputClass} appearance-none`;
const cardClass = 'rounded-[26px] border border-white/10 bg-white/5 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.14)] backdrop-blur-xl';
const uploadClass = 'block w-full cursor-pointer rounded-[22px] border border-dashed border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-medium text-white/75 transition hover:border-white/25 hover:bg-white/10 hover:text-white';

const Popover: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; className?: string }> = ({ title, children, onClose, className = '' }) => (
  <div className={`absolute top-full left-1/2 z-40 mt-3 w-[calc(100vw-24px)] max-w-[390px] -translate-x-1/2 rounded-[24px] border border-white/12 bg-[#09090be8] p-5 text-white backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:max-w-[430px] ${className}`} onClick={(e) => e.stopPropagation()}>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
      <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 shadow-sm transition hover:bg-white hover:text-slate-900" aria-label="Close panel">
        &times;
      </button>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const TextWorkspacePanel: React.FC<{ children: React.ReactNode; onClose: () => void }> = ({ children, onClose }) => (
  <div className="fixed inset-x-3 bottom-3 z-50 max-h-[72svh] overflow-hidden rounded-[30px] border border-white/12 bg-[#09090be8] text-white shadow-[0_30px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:inset-x-auto md:bottom-4 md:left-4 md:top-24 md:w-[430px] md:max-h-[calc(100svh-112px)]" onClick={(e) => e.stopPropagation()}>
    <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-white">Text & AI</h3>
        <p className="mt-1 text-xs leading-5 text-white/55">Docked workspace keeps the canvas visible while you edit.</p>
      </div>
      <button onClick={onClose} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 shadow-sm transition hover:bg-white hover:text-slate-900" aria-label="Close panel">
        &times;
      </button>
    </div>
    <div className="max-h-[calc(72svh-86px)] overflow-y-auto p-4 md:max-h-[calc(100svh-198px)] md:p-5">
      <div className="space-y-4">{children}</div>
    </div>
  </div>
);

const ToolbarButton: React.FC<{ onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; isActive: boolean; children: React.ReactNode; icon: React.ComponentType<{ className?: string }>; rainbow?: boolean }> = ({ onClick, isActive, children, icon: Icon, rainbow = false }) => {
  const content = (
    <>
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </>
  );

  if (rainbow) {
    return (
      <RainbowButton onClick={onClick} className={`h-11 px-4 text-sm ${isActive ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
        {content}
      </RainbowButton>
    );
  }

  return (
    <button onClick={onClick} className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-medium tracking-tight transition-all duration-200 ${isActive ? 'border-white/20 bg-white/14 text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]' : 'border-white/10 bg-white/6 text-white/80 shadow-sm hover:-translate-y-0.5 hover:bg-white/10 hover:text-white'}`}>
      {content}
    </button>
  );
};

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
      <header className="fixed inset-x-0 top-4 z-30 flex justify-center px-4">
        <div ref={controlsRef} className="relative">
          <div className="flex flex-wrap items-center justify-center gap-2 rounded-[28px] border border-white/12 bg-[#09090bd6] p-2.5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:gap-2.5">
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('text'); }} isActive={activeMenu === 'text'} icon={Sparkles} rainbow>Text & AI</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('fonts'); }} isActive={activeMenu === 'fonts'} icon={Type}>Fonts</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('stickers'); }} isActive={activeMenu === 'stickers'} icon={Image}>Stickers</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('style'); }} isActive={activeMenu === 'style'} icon={Palette}>Style</ToolbarButton>
            <ToolbarButton onClick={(e) => { e.stopPropagation(); toggleMenu('bg'); }} isActive={activeMenu === 'bg'} icon={Palette}>Background</ToolbarButton>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-white/6 p-1 shadow-sm">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white/70">
                <Languages className="h-4 w-4" />
              </div>
              <button onClick={() => props.onLanguageChange(Language.RU)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${props.language === Language.RU ? 'bg-white text-slate-900 shadow' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>RU</button>
              <button onClick={() => props.onLanguageChange(Language.EN)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${props.language === Language.EN ? 'bg-white text-slate-900 shadow' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}>EN</button>
            </div>

            <div className="flex gap-1.5">
              <RainbowButton onClick={() => props.onDownload('png')} className="h-11 px-4 text-sm">
                <Download className="h-4 w-4" />
                PNG
              </RainbowButton>
              <button onClick={() => props.onDownload('jpeg')} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:bg-white/10">
                <Download className="h-4 w-4" />
                JPEG
              </button>
            </div>
          </div>

          {activeMenu === 'text' && (
            <TextWorkspacePanel onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Ayah</label>
                  <textarea className={`${inputClass} min-h-[120px] resize-y text-lg lg:min-h-[150px]`} style={{ fontFamily: "'Amiri', serif", direction: 'rtl' }} value={props.ayah.text} onChange={(e) => props.setAyah((a) => ({ ...a, text: e.target.value, position: { ...a.position, x: -1 } }))} />
                  <RainbowButton onClick={props.onApplyKashida} disabled={props.isApplyingKashida || !props.ayah.text.trim()} className="mt-3 w-full text-sm font-semibold">
                    {props.isApplyingKashida && <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />}
                    {props.isApplyingKashida ? 'Adding Kashida...' : 'Enhance with Kashida'}
                  </RainbowButton>
                  <p className="mt-2 text-xs leading-5 text-white/55">
                    {props.isApplyingKashida ? 'Applying fast local calligraphic stretch...' : 'Fast local Kashida adds calligraphic elongation without waiting for AI.'}
                  </p>
                </div>
                <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Translation</label>
                  <textarea className={`${inputClass} min-h-[120px] resize-y lg:min-h-[150px]`} value={props.translation.text} onChange={(e) => props.setTranslation((t) => ({ ...t, text: e.target.value, position: { ...t.position, x: -1 } }))} />
                  <label className="mb-2 mt-4 block text-sm font-medium text-white/70">Manual highlight words</label>
                  <InputWithTags value={props.highlightedWords} onChange={props.setHighlightedWords} limit={12} className="max-w-none" placeholder="Add highlight words and press Enter..." />
                  <p className="mt-2 text-xs leading-5 text-white/55">You can add or remove highlight words manually, or let AI suggest them.</p>
                  <RainbowButton onClick={props.onHighlight} disabled={props.isHighlighting} className="mt-4 w-full text-sm font-semibold">
                    {props.isHighlighting ? 'Analyzing...' : 'Highlight Key Words'}
                  </RainbowButton>
                </div>
              </div>
            </TextWorkspacePanel>
          )}

          {activeMenu === 'fonts' && (
            <Popover title="Fonts" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Ayah Font</label>
                  <select value={props.ayah.font} onChange={(e) => props.setAyah((a) => ({ ...a, font: e.target.value }))} className={selectClass}>
                    {props.arabicFonts.map((f) => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Translation Font</label>
                  <select value={props.translation.font} onChange={(e) => props.setTranslation((t) => ({ ...t, font: e.target.value }))} className={selectClass}>
                    {props.translationFonts.map((f) => <option key={f.value} value={f.value} disabled={f.disabled}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white/70">Custom Fonts</label>
                  <div className={`${cardClass} mb-2 max-h-32 space-y-2 overflow-y-auto`}>
                    {props.customFonts.length > 0 ? props.customFonts.map((font) => (
                      <div key={font.familyName} className="flex items-center justify-between rounded-2xl bg-white/8 p-2.5 text-sm text-white shadow-sm">
                        <span className="truncate" title={font.name}>{font.name}</span>
                        <button onClick={() => props.onRemoveCustomFont(font.familyName)} className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold text-white/50 transition hover:bg-red-500/15 hover:text-red-300" title={`Remove ${font.name}`}>
                          &times;
                        </button>
                      </div>
                    )) : <p className="py-2 text-center text-xs text-white/55">No custom fonts.</p>}
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
                    <div className="col-span-4 py-4 text-center text-sm text-white/55">Your uploaded stickers will appear here.</div>
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
                  <label className="flex justify-between text-sm font-medium text-white/70">Ayah Size <span>{props.ayah.size}px</span></label>
                  <input type="range" min="16" max="80" value={props.ayah.size} onChange={(e) => props.setAyah((a) => ({ ...a, size: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <div>
                  <label className="flex justify-between text-sm font-medium text-white/70">Translation Size <span>{props.translation.size}px</span></label>
                  <input type="range" min="8" max="40" value={props.translation.size} onChange={(e) => props.setTranslation((t) => ({ ...t, size: Number(e.target.value) }))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                </div>
                <div className={`${cardClass} flex items-center justify-between gap-4`}>
                  <label htmlFor="textColor" className="text-sm font-medium text-white/70">Text Color</label>
                  <input type="color" id="textColor" value={props.textColor} onChange={(e) => props.setTextColor(e.target.value)} className="w-10 h-10 border-none bg-transparent" />
                </div>
              </div>
            </Popover>
          )}

          {activeMenu === 'bg' && (
            <Popover title="Background" onClose={() => setActiveMenu(null)}>
              <div className="space-y-4">
                <div className={`${cardClass} flex items-center justify-between gap-4`}>
                  <label htmlFor="bgColor" className="text-sm font-medium text-white/70">Background Color</label>
                  <input type="color" id="bgColor" value={props.bgColor} onChange={(e) => props.setBgColor(e.target.value)} className="w-10 h-10 border-none bg-transparent" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => props.setBackgroundMode(BackgroundMode.GRADIENT)} className={`rounded-2xl p-3 text-sm font-semibold transition ${props.backgroundMode === BackgroundMode.GRADIENT ? 'bg-white text-slate-900 shadow-[0_12px_24px_rgba(255,255,255,0.14)]' : 'bg-white/8 text-white/80 hover:bg-white/12'}`}>Gradient</button>
                  <button onClick={() => props.setBackgroundMode(BackgroundMode.TRANSPARENT)} className={`rounded-2xl p-3 text-sm font-semibold transition ${props.backgroundMode === BackgroundMode.TRANSPARENT ? 'bg-white text-slate-900 shadow-[0_12px_24px_rgba(255,255,255,0.14)]' : 'bg-white/8 text-white/80 hover:bg-white/12'}`}>Transparent</button>
                </div>
                {props.backgroundMode !== BackgroundMode.SOLID && <button onClick={() => props.setBackgroundMode(BackgroundMode.SOLID)} className="mt-2 w-full rounded-2xl bg-white/8 p-3 text-sm font-semibold text-white transition hover:bg-white/12">Use Solid Color</button>}
              </div>
            </Popover>
          )}
        </div>
      </header>
    </>
  );
};

export default ControlsPanel;