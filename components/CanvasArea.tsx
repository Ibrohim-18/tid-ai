import React, { useRef, useEffect, forwardRef, useCallback } from 'react';
import type { TextElement, StickerElement } from '../types';
import { BackgroundMode } from '../types';

interface CanvasAreaProps {
  ayah: TextElement;
  setAyah: React.Dispatch<React.SetStateAction<TextElement>>;
  translation: TextElement;
  setTranslation: React.Dispatch<React.SetStateAction<TextElement>>;
  textColor: string;
  bgColor: string;
  backgroundMode: BackgroundMode;
  highlightedWords: string[];
  draggingElement: string | null;
  setDraggingElement: React.Dispatch<React.SetStateAction<string | null>>;
  stickers: StickerElement[];
  onUpdateSticker: (id: string, newProps: Partial<StickerElement>) => void;
  onRemoveSticker: (id: string) => void;
  activeElementId: string | null;
  setActiveElementId: React.Dispatch<React.SetStateAction<string | null>>;
  onSelectSticker: (id: string) => void;
}

interface DraggableTextProps {
  element: TextElement;
  onPositionChange: (pos: { x: number; y: number }) => void;
  style: React.CSSProperties;
  canvasRef: React.RefObject<HTMLDivElement>;
  isDraggingClass: string;
  highlightedWords?: string[];
  id: 'ayah' | 'translation';
  setDraggingElement: React.Dispatch<React.SetStateAction<string | null>>;
}

const DraggableText: React.FC<DraggableTextProps> = ({
  element,
  onPositionChange,
  style,
  canvasRef,
  isDraggingClass,
  highlightedWords,
  id,
  setDraggingElement,
}) => {
  const elemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elemRef.current;
    const canvasEl = canvasRef.current;
    if (el && canvasEl && element.position.x < 0) {
      el.style.visibility = 'hidden';
      setTimeout(() => {
        const canvasWidth = canvasEl.offsetWidth;
        const elWidth = el.offsetWidth;
        const centeredX = (canvasWidth - elWidth) / 2;
        onPositionChange({ x: centeredX, y: element.position.y });
        el.style.visibility = 'visible';
      }, 0);
    }
  }, [canvasRef, element.position.x, element.position.y, onPositionChange]);

  useEffect(() => {
    const el = elemRef.current;
    if (!el) return;

    const classes = isDraggingClass.split(' ').filter(Boolean);

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setDraggingElement(id);
      el.classList.add(...classes);
      const canvasRect = canvasRef.current!.getBoundingClientRect();

      const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const startLeft = el.offsetLeft;
      const startTop = el.offsetTop;

      const handleMouseMove = (me: MouseEvent | TouchEvent) => {
        const moveX = 'touches' in me ? me.touches[0].clientX : me.clientX;
        const moveY = 'touches' in me ? me.touches[0].clientY : me.clientY;

        let newX = startLeft + (moveX - startX);
        let newY = startTop + (moveY - startY);

        const snapThreshold = 8;
        const canvasCenterX = canvasRect.width / 2;
        const canvasCenterY = canvasRect.height / 2;
        const elementCenterX = newX + el.offsetWidth / 2;
        const elementCenterY = newY + el.offsetHeight / 2;

        if (Math.abs(elementCenterX - canvasCenterX) < snapThreshold) {
          newX = canvasCenterX - el.offsetWidth / 2;
        }
        if (Math.abs(elementCenterY - canvasCenterY) < snapThreshold) {
          newY = canvasCenterY - el.offsetHeight / 2;
        }

        newX = Math.max(0, Math.min(newX, canvasRect.width - el.offsetWidth));
        newY = Math.max(0, Math.min(newY, canvasRect.height - el.offsetHeight));

        onPositionChange({ x: newX, y: newY });
      };

      const handleMouseUp = () => {
        setDraggingElement(null);
        el.classList.remove(...classes);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleMouseMove);
        document.removeEventListener('touchend', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove);
      document.addEventListener('touchend', handleMouseUp);
    };

    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('touchstart', handleMouseDown);

    return () => {
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('touchstart', handleMouseDown);
    };
  }, [onPositionChange, canvasRef, isDraggingClass, id, setDraggingElement]);

  const renderContent = () => {
    if (!highlightedWords || highlightedWords.length === 0) {
      return element.text;
    }

    const regex = new RegExp(`\\b(${highlightedWords.join('|')})\\b`, 'gi');
    return element.text.split(regex).map((part, index) => {
      const isMatch = highlightedWords.some((word) => word.toLowerCase() === part.toLowerCase());
      return isMatch ? <span key={index} className="highlight">{part}</span> : part;
    });
  };

  return (
    <div
      ref={elemRef}
      className="absolute cursor-move select-none draggable-text-wrapper"
      style={{
        ...style,
        left: `${element.position.x}px`,
        top: `${element.position.y}px`,
        width: 'fit-content',
        maxWidth: '90%',
        padding: '12px',
        visibility: element.position.x < 0 ? 'hidden' : 'visible',
      }}
    >
      {renderContent()}
    </div>
  );
};

const Sticker: React.FC<{
  sticker: StickerElement;
  onUpdate: (id: string, props: Partial<StickerElement>) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  isActive: boolean;
}> = ({ sticker, onUpdate, onRemove, onSelect, isActive }) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleInteraction = useCallback((e: MouseEvent | TouchEvent, interactionType: 'drag' | 'resize' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(sticker.id);

    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startPosition = sticker.position;
    const startWidth = sticker.width;
    const startRotation = sticker.rotation;
    const startAngle = Math.atan2(startY - centerY, startX - centerX);
    const startDist = Math.hypot(startX - centerX, startY - centerY);

    const handleMouseMove = (me: MouseEvent | TouchEvent) => {
      const moveX = 'touches' in me ? me.touches[0].clientX : me.clientX;
      const moveY = 'touches' in me ? me.touches[0].clientY : me.clientY;

      if (interactionType === 'drag') {
        onUpdate(sticker.id, {
          position: {
            x: startPosition.x + (moveX - startX),
            y: startPosition.y + (moveY - startY),
          },
        });
      } else if (interactionType === 'rotate') {
        const angle = Math.atan2(moveY - centerY, moveX - centerX);
        onUpdate(sticker.id, { rotation: startRotation + ((angle - startAngle) * 180) / Math.PI });
      } else {
        const dist = Math.hypot(moveX - centerX, moveY - centerY);
        const newWidth = Math.max(20, startWidth * (dist / startDist));
        const deltaWidth = newWidth - startWidth;
        const deltaHeight = newWidth / sticker.aspectRatio - startWidth / sticker.aspectRatio;
        const offsetX = -deltaWidth / 2;
        const offsetY = -deltaHeight / 2;
        const theta = (startRotation * Math.PI) / 180;
        const rotatedOffsetX = offsetX * Math.cos(theta) - offsetY * Math.sin(theta);
        const rotatedOffsetY = offsetX * Math.sin(theta) + offsetY * Math.cos(theta);

        onUpdate(sticker.id, {
          width: newWidth,
          position: {
            x: startPosition.x + rotatedOffsetX,
            y: startPosition.y + rotatedOffsetY,
          },
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove);
      document.removeEventListener('touchend', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove);
    document.addEventListener('touchend', handleMouseUp);
  }, [sticker, onUpdate, onSelect]);

  const controlSize = 16;
  const controlOffset = -(controlSize / 2);

  return (
    <div
      ref={ref}
      className="absolute select-none"
      onMouseDown={(e) => handleInteraction(e.nativeEvent, 'drag')}
      onTouchStart={(e) => handleInteraction(e.nativeEvent, 'drag')}
      style={{
        left: sticker.position.x,
        top: sticker.position.y,
        width: sticker.width,
        height: sticker.width / sticker.aspectRatio,
        transform: `rotate(${sticker.rotation}deg)`,
        zIndex: sticker.zIndex,
      }}
    >
      <img src={sticker.src} className="w-full h-full" draggable={false} alt="sticker" />
      {isActive && (
        <>
          <div className="sticker-border absolute inset-0 border-2 border-dashed border-indigo-400 pointer-events-none" />
          <div className="sticker-control absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize" style={{ bottom: controlOffset, right: controlOffset, zIndex: sticker.zIndex + 1 }} onMouseDown={(e) => handleInteraction(e.nativeEvent, 'resize')} onTouchStart={(e) => handleInteraction(e.nativeEvent, 'resize')} />
          <div className="sticker-control absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-alias" style={{ top: controlOffset, right: controlOffset, zIndex: sticker.zIndex + 1 }} onMouseDown={(e) => handleInteraction(e.nativeEvent, 'rotate')} onTouchStart={(e) => handleInteraction(e.nativeEvent, 'rotate')} />
          <div className="sticker-control absolute w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center font-bold border-2 border-white rounded-full cursor-pointer" style={{ top: controlOffset, left: controlOffset, zIndex: sticker.zIndex + 1 }} onClick={(e) => { e.stopPropagation(); onRemove(sticker.id); }}>
            &#x2715;
          </div>
        </>
      )}
    </div>
  );
};

const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>((props, ref) => {
  const {
    ayah,
    setAyah,
    translation,
    setTranslation,
    textColor,
    bgColor,
    backgroundMode,
    highlightedWords,
    draggingElement,
    setDraggingElement,
    stickers,
    onUpdateSticker,
    onRemoveSticker,
    activeElementId,
    setActiveElementId,
    onSelectSticker,
  } = props;

  const handleAyahPosChange = useCallback((pos: { x: number; y: number }) => {
    setAyah((a) => ({ ...a, position: pos }));
  }, [setAyah]);

  const handleTranslationPosChange = useCallback((pos: { x: number; y: number }) => {
    setTranslation((t) => ({ ...t, position: pos }));
  }, [setTranslation]);

  const canvasClasses = ['relative w-full h-full overflow-hidden transition-all duration-300'];
  const canvasStyles: React.CSSProperties = {};

  if (backgroundMode === BackgroundMode.SOLID) {
    canvasStyles.backgroundColor = bgColor;
  } else if (backgroundMode === BackgroundMode.GRADIENT) {
    canvasClasses.push('bg-gradient-to-br from-indigo-500 to-purple-600');
  } else {
    canvasClasses.push("bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAACRJREFUOE9jZGBgEGHAD97/p08f4i58+PChH5AR6kaQfQBN0QEAm400y+QxImMAAAAASUVORK5CYII=')] bg-repeat");
    canvasStyles.backgroundColor = 'transparent';
  }

  const effectiveTextColor = backgroundMode === BackgroundMode.GRADIENT ? '#FFFFFF' : textColor;

  const ayahStyle: React.CSSProperties = {
    fontFamily: ayah.font,
    fontSize: `${ayah.size}px`,
    color: effectiveTextColor,
    direction: 'rtl',
    textAlign: 'center',
    lineHeight: 2.5,
  };

  const translationStyle: React.CSSProperties = {
    fontFamily: translation.font,
    fontSize: `${translation.size}px`,
    color: effectiveTextColor,
    textAlign: 'center',
    lineHeight: 1.6,
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setActiveElementId(null);
    }
  };

  return (
    <div id="canvas" ref={ref} className={canvasClasses.join(' ')} style={canvasStyles} onMouseDown={handleCanvasClick}>
      {draggingElement && (
        <>
          <div className="absolute top-1/2 left-0 w-full h-0 border-t border-dashed border-gray-400/80 pointer-events-none z-20" aria-hidden="true" />
          <div className="absolute left-1/2 top-0 h-full w-0 border-l border-dashed border-gray-400/80 pointer-events-none z-20" aria-hidden="true" />
        </>
      )}
      <DraggableText
        id="ayah"
        element={ayah}
        onPositionChange={handleAyahPosChange}
        style={ayahStyle}
        canvasRef={ref as React.RefObject<HTMLDivElement>}
        isDraggingClass="opacity-50 scale-105"
        setDraggingElement={setDraggingElement}
      />
      <DraggableText
        id="translation"
        element={translation}
        onPositionChange={handleTranslationPosChange}
        style={translationStyle}
        canvasRef={ref as React.RefObject<HTMLDivElement>}
        isDraggingClass="opacity-50 scale-105"
        highlightedWords={highlightedWords}
        setDraggingElement={setDraggingElement}
      />
      {stickers.map((sticker) => (
        <Sticker key={sticker.id} sticker={sticker} onUpdate={onUpdateSticker} onRemove={onRemoveSticker} onSelect={onSelectSticker} isActive={sticker.id === activeElementId} />
      ))}
    </div>
  );
});

export default CanvasArea;