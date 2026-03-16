'use client';

import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TagProps {
  text: string;
  onRemove: () => void;
}

const Tag = ({ text, onRemove }: TagProps) => (
  <motion.span
    initial={{ opacity: 0, scale: 0.8, y: -10, filter: 'blur(10px)' }}
    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
    exit={{ opacity: 0, scale: 0.8, y: -10, filter: 'blur(10px)' }}
    transition={{ duration: 0.4, ease: 'circInOut', type: 'spring' }}
    className="flex items-center gap-1 rounded-xl bg-[#11111198] px-2 py-1 text-sm text-white shadow-[0_0_10px_rgba(0,0,0,0.2)] backdrop-blur-sm"
  >
    {text}
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-6 w-6 rounded-full bg-transparent p-1 text-white hover:bg-[#11111136]">
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  </motion.span>
);

interface InputWithTagsProps {
  placeholder?: string;
  className?: string;
  limit?: number;
  value?: string[];
  onChange?: (tags: string[]) => void;
}

const InputWithTags = ({ placeholder, className, limit = 10, value, onChange }: InputWithTagsProps) => {
  const [internalTags, setInternalTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  const tags = useMemo(() => value ?? internalTags, [internalTags, value]);

  const updateTags = (nextTags: string[]) => {
    if (value === undefined) {
      setInternalTags(nextTags);
    }
    onChange?.(nextTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();

      const nextTag = inputValue.trim();
      if ((limit && tags.length >= limit) || tags.includes(nextTag)) return;

      updateTags([...tags, nextTag]);
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    updateTags(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className={cn('flex w-full max-w-xl flex-col gap-2', className)}>
      <motion.div initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}>
        <motion.input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'Type something and press Enter...'}
          whileHover={{ scale: 1.01, backgroundColor: '#111111d1' }}
          whileTap={{ scale: 0.99, backgroundColor: '#11111198' }}
          className="w-full rounded-xl border-none bg-[#11111198] px-4 py-2 text-white shadow-[0_0_20px_rgba(0,0,0,0.2)] outline-none ring-0 backdrop-blur-sm placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={limit ? tags.length >= limit : false}
        />
      </motion.div>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <Tag key={`${tag}-${index}`} text={tag} onRemove={() => removeTag(index)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export { InputWithTags };