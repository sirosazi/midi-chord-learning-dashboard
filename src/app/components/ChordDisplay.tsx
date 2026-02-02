import { motion } from 'motion/react';

interface ChordDisplayProps {
  chordName: string;
  intervals: string[];
  /** MIDIタブ用にコンパクト表示 */
  size?: 'default' | 'compact';
}

export function ChordDisplay({ chordName, intervals, size = 'default' }: ChordDisplayProps) {
  const isCompact = size === 'compact';

  // 空文字列の場合は何も表示しない
  if (!chordName) {
    return (
      <div
        className={`flex items-center justify-center ${isCompact ? 'mb-3 h-12' : 'mb-6 h-24'}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${isCompact ? 'mb-3' : 'mb-6'}`}
    >
      <motion.div
        key={chordName}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <h2
          className={`font-bold text-transparent bg-gradient-to-r from-cyan-400 via-cyan-300 to-purple-400 bg-clip-text drop-shadow-[0_0_30px_rgba(34,211,238,0.5)] ${
            isCompact ? 'text-4xl' : 'text-7xl'
          }`}
        >
          {chordName}
        </h2>
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-400 opacity-20 blur-3xl -z-10" />
      </motion.div>
    </div>
  );
}