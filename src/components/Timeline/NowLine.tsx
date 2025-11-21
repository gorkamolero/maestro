import { memo } from 'react';

/**
 * NowLine node component - renders as a React Flow node to stay positioned on canvas
 */
function NowLineComponent() {
  return (
    <div className="relative w-0.5 h-screen pointer-events-none">
      <div
        className="absolute top-0 left-0 w-full h-full bg-primary"
        style={{
          boxShadow: '0 0 10px hsl(var(--primary))',
        }}
      />
      <div className="absolute -top-1 -left-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center pointer-events-none">
        <div className="w-2 h-2 bg-background rounded-full" />
      </div>
      <div className="absolute -top-8 left-2 text-xs font-mono text-primary whitespace-nowrap pointer-events-none">
        NOW
      </div>
    </div>
  );
}

export const NowLine = memo(NowLineComponent);
