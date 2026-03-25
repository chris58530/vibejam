import { useEffect, useState } from 'react';

const MESSAGES = [
  'Brewing creative ideas...',
  'Connecting the dots...',
  'Assembling your universe...',
  'Polishing the pixels...',
  'Warming up the neurons...',
  'Crafting something special...',
  'Almost there...',
];

interface ThinkingLoaderProps {
  dark?: boolean;
}

export default function ThinkingLoader({ dark = false }: ThinkingLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex(i => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 2800);
    return () => clearInterval(cycle);
  }, []);

  const textMuted = dark ? 'text-white/30' : 'text-on-surface/30';
  const dotColor = dark ? 'bg-purple-400' : 'bg-primary';

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* Floating emoji */}
      <div className="thinking-float text-5xl">🧠</div>

      {/* "thinking" shimmer text */}
      <div className="flex items-end gap-1">
        <span className="thinking-shimmer-text thinking-glow font-bold text-4xl tracking-widest lowercase">
          thinking
        </span>
        <span className="flex items-end gap-[3px] pb-1.5">
          <span className={`thinking-dot w-2 h-2 rounded-full ${dotColor}`} />
          <span className={`thinking-dot w-2 h-2 rounded-full ${dotColor}`} />
          <span className={`thinking-dot w-2 h-2 rounded-full ${dotColor}`} />
        </span>
      </div>

      {/* Cycling subtitle */}
      <p
        className={`text-sm font-mono tracking-wide ${textMuted}`}
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.4s, transform 0.4s' }}
      >
        {MESSAGES[msgIndex]}
      </p>
    </div>
  );
}
