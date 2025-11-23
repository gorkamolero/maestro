import { useState, useEffect } from 'react';
import EmojiPicker, { type EmojiClickData, Theme } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface EmojiPickerComponentProps {
  value?: string;
  onChange: (emoji: string) => void;
  children: React.ReactNode;
}

export function EmojiPickerComponent({ onChange, children }: EmojiPickerComponentProps) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(Theme.DARK);

  useEffect(() => {
    // Check if dark mode is active
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? Theme.DARK : Theme.LIGHT);

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? Theme.DARK : Theme.LIGHT);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onChange(emojiData.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-full p-0 border-0" align="start">
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          autoFocusSearch={false}
          searchDisabled
          skinTonesDisabled
          width="100%"
          height={350}
          theme={theme}
        />
      </PopoverContent>
    </Popover>
  );
}
