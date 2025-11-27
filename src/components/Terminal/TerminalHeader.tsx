import { Terminal, Palette, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TerminalTheme } from './XTermWrapper';

interface TerminalHeaderProps {
  workingDir: string | null;
  theme: TerminalTheme;
  onThemeChange: (theme: TerminalTheme) => void;
}

const THEMES: { value: TerminalTheme; label: string }[] = [
  { value: 'termius-dark', label: 'Termius' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'nord', label: 'Nord' },
];

export function TerminalHeader({ workingDir, theme, onThemeChange }: TerminalHeaderProps) {
  return (
    <div
      className="terminal-header flex items-center justify-between px-4 py-2 border-b"
      style={{
        background: 'rgba(15, 15, 15, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="flex items-center gap-2">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium">{workingDir || 'Terminal'}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme selector */}
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-background/40">
          <Palette className="w-3 h-3 text-muted-foreground" />
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as TerminalTheme)}
            className="text-xs bg-transparent border-none focus:outline-none cursor-pointer"
          >
            {THEMES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Copy className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Download className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
