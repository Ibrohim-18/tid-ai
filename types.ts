
export interface TextElement {
  text: string;
  font: string;
  size: number;
  position: { x: number; y: number };
}

export interface StickerElement {
  id: string;
  src: string;
  position: { x: number; y: number };
  width: number;
  rotation: number;
  aspectRatio: number;
  zIndex: number;
}

export enum Language {
  RU = 'ru',
  EN = 'en',
}

export enum BackgroundMode {
  SOLID = 'solid',
  GRADIENT = 'gradient',
  TRANSPARENT = 'transparent',
}

export enum CustomFontTarget {
  AYAH = 'ayah',
  TRANSLATION = 'translation',
}

export interface CustomFont {
  name: string;
  url: string;
  familyName: string;
  format?: string;
}