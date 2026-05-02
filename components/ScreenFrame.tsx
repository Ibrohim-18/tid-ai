import React from 'react';
import type { ScreenPart, TextElement } from '../types';
import { BackgroundMode } from '../types';

interface ScreenFrameProps {
  part: ScreenPart;
  partIndex: number;
  totalParts: number;
  ayahNumber: string;
  ayah: TextElement;
  translation: TextElement;
  textColor: string;
  bgColor: string;
  backgroundMode: BackgroundMode;
  className?: string;
  fontScale?: number;
  showTransparentPreviewGrid?: boolean;
}

const withOpacity = (hexColor: string, opacity: number): string => {
  if (!hexColor.startsWith('#')) {
    return hexColor;
  }

  const hex = hexColor.slice(1);
  const normalized = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;

  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const toArabicIndicDigits = (value: string): string => (
  value.replace(/[0-9]/g, (digit) => String.fromCharCode(0x0660 + Number(digit)))
);

const getBackgroundStyle = (mode: BackgroundMode, bgColor: string, showGrid: boolean): React.CSSProperties => {
  if (mode === BackgroundMode.SOLID) {
    return { backgroundColor: bgColor };
  }

  if (mode === BackgroundMode.GRADIENT) {
    return { backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #9333ea 100%)' };
  }

  if (!showGrid) {
    return { backgroundColor: 'transparent' };
  }

  return {
    backgroundColor: 'transparent',
    backgroundImage: [
      'linear-gradient(45deg, rgba(255,255,255,0.10) 25%, transparent 25%)',
      'linear-gradient(-45deg, rgba(255,255,255,0.10) 25%, transparent 25%)',
      'linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.10) 75%)',
      'linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.10) 75%)',
    ].join(', '),
    backgroundPosition: '0 0, 0 18px, 18px -18px, -18px 0',
    backgroundSize: '36px 36px',
  };
};

const ScreenFrame: React.FC<ScreenFrameProps> = ({
  part,
  partIndex,
  totalParts,
  ayahNumber,
  ayah,
  translation,
  textColor,
  bgColor,
  backgroundMode,
  className = '',
  fontScale = 1,
  showTransparentPreviewGrid = false,
}) => {
  const isPreviewScale = fontScale < 1;
  const ayahFontSize = Math.max(isPreviewScale ? 12 : 16, ayah.size * fontScale);
  const translationFontSize = Math.max(isPreviewScale ? 6 : 8, translation.size * fontScale);
  const isLastPart = partIndex === totalParts - 1;
  const normalizedAyahNumber = toArabicIndicDigits(ayahNumber.trim());
  const shouldShowBadge = isLastPart && normalizedAyahNumber.length > 0;
  const ayahTextColor = backgroundMode === BackgroundMode.GRADIENT ? '#ffffff' : textColor;
  const translationTextColor = backgroundMode === BackgroundMode.GRADIENT ? 'rgba(255,255,255,0.68)' : withOpacity(textColor, 0.68);
  const transparentTextShadow = backgroundMode === BackgroundMode.TRANSPARENT
    ? '0 1px 2px rgba(0,0,0,0.86), 0 0 5px rgba(0,0,0,0.58), 0 2px 12px rgba(0,0,0,0.26)'
    : undefined;

  return (
    <div
      className={`screen-frame relative h-full w-full overflow-hidden ${className}`}
      style={getBackgroundStyle(backgroundMode, bgColor, showTransparentPreviewGrid)}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center px-[11%] text-center">
        <div
          dir="rtl"
          className="max-w-full whitespace-pre-wrap break-words"
          style={{
            color: ayahTextColor,
            fontFamily: ayah.font,
            fontSize: ayahFontSize,
            lineHeight: 2.15,
            textShadow: transparentTextShadow,
          }}
        >
          {part.ayah}
          {shouldShowBadge && (
            <span
              className="mx-[0.35em] inline-flex items-center justify-center rounded-full border align-middle"
              style={{
                borderColor: ayahTextColor,
                color: ayahTextColor,
                fontFamily: ayah.font,
                fontSize: `${Math.max(6, ayahFontSize * 0.42)}px`,
                height: `${Math.max(14, ayahFontSize * 1.45)}px`,
                lineHeight: 1,
                minWidth: `${Math.max(14, ayahFontSize * 1.45)}px`,
                paddingInline: `${Math.max(2, ayahFontSize * 0.18)}px`,
                textShadow: transparentTextShadow,
              }}
            >
              {normalizedAyahNumber}
            </span>
          )}
        </div>

        <div
          className="mt-[2.2%] max-w-full whitespace-pre-wrap break-words"
          style={{
            color: translationTextColor,
            fontFamily: translation.font,
            fontSize: translationFontSize,
            lineHeight: 1.55,
            textShadow: transparentTextShadow,
          }}
        >
          {part.translation}
        </div>
      </div>
    </div>
  );
};

export default ScreenFrame;
