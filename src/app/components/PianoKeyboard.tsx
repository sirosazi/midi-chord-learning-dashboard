import { motion } from 'motion/react';
import { useState } from 'react';

interface PianoKeyboardProps {
  pressedKeys?: number[]; // MIDI note numbers
  guideKeys?: number[];  // ガイド表示する鍵（押すべきコードの音・別色で表示）
  onKeyDown?: (midiNote: number) => void; // マウスダウンハンドラー
  onKeyUp?: (midiNote: number) => void; // マウスアップハンドラー
}

export function PianoKeyboard({ pressedKeys = [], guideKeys = [], onKeyDown, onKeyUp }: PianoKeyboardProps) {
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);

  // Generate keys from C2 to C6 (MIDI 36 to 84) - 49 keys total
  const generateKeys = () => {
    const keys = [];
    const whiteKeyWidth = 40;
    const blackKeyWidth = 24;

    const octavePattern = [
      { type: 'white', note: 'C', black: true },
      { type: 'black', note: 'C#' },
      { type: 'white', note: 'D', black: true },
      { type: 'black', note: 'D#' },
      { type: 'white', note: 'E', black: false },
      { type: 'white', note: 'F', black: true },
      { type: 'black', note: 'F#' },
      { type: 'white', note: 'G', black: true },
      { type: 'black', note: 'G#' },
      { type: 'white', note: 'A', black: true },
      { type: 'black', note: 'A#' },
      { type: 'white', note: 'B', black: false },
    ];

    let midiNote = 36; // C2
    let whiteKeyIndex = 0;

    for (let i = 0; i < 49; i++) {
      const octave = Math.floor((midiNote - 12) / 12);
      const noteInOctave = (midiNote - 12) % 12;
      const keyInfo = octavePattern[noteInOctave];
      
      if (keyInfo.type === 'white') {
        keys.push({
          midiNote,
          type: 'white',
          note: keyInfo.note + octave,
          position: whiteKeyIndex * whiteKeyWidth,
          hasBlack: keyInfo.black,
        });
        whiteKeyIndex++;
      } else {
        keys.push({
          midiNote,
          type: 'black',
          note: keyInfo.note + octave,
          position: (whiteKeyIndex - 1) * whiteKeyWidth + whiteKeyWidth - blackKeyWidth / 2,
        });
      }
      
      midiNote++;
    }

    return keys;
  };

  const keys = generateKeys();
  const whiteKeys = keys.filter(k => k.type === 'white');
  const blackKeys = keys.filter(k => k.type === 'black');
  const totalWidth = whiteKeys.length * 40; // 白鍵の総幅

  return (
    <div className="relative bg-gradient-to-b from-gray-900 to-black p-8 rounded-t-2xl border-t border-x border-gray-700">
      <h3 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Piano (C2 - C6)</h3>
      
      <div className="flex justify-center">
        <div className="relative" style={{ height: '200px', width: `${totalWidth}px` }}>
          {/* White Keys */}
          {whiteKeys.map((key) => {
            const isPressed = pressedKeys.includes(key.midiNote);
            const isGuide = !isPressed && guideKeys.includes(key.midiNote);
            const isHovered = hoveredKey === key.midiNote;
            
            return (
              <motion.div
                key={key.midiNote}
                className={`
                  absolute bottom-0 rounded-b-lg border-2 cursor-pointer transition-all
                  ${isPressed 
                    ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.8)]' 
                    : isGuide
                      ? 'bg-amber-200/90 border-amber-400'
                      : isHovered
                        ? 'bg-gray-100 border-gray-300'
                        : 'bg-white border-gray-400'
                  }
                `}
                style={{
                  left: `${key.position}px`,
                  width: '40px',
                  height: '160px',
                }}
                animate={isPressed ? {
                  scaleY: 0.95,
                  y: 5,
                } : {
                  scaleY: 1,
                  y: 0,
                }}
                transition={{ duration: 0.1 }}
                onMouseEnter={() => setHoveredKey(key.midiNote)}
                onMouseLeave={() => setHoveredKey(null)}
                onMouseDown={() => onKeyDown?.(key.midiNote)}
                onMouseUp={() => onKeyUp?.(key.midiNote)}
                onMouseOut={() => {
                  // マウスが鍵盤の外に出た場合も音を止める
                  if (isPressed) {
                    onKeyUp?.(key.midiNote);
                  }
                }}
              />
            );
          })}

          {/* Black Keys */}
          {blackKeys.map((key) => {
            const isPressed = pressedKeys.includes(key.midiNote);
            const isGuide = !isPressed && guideKeys.includes(key.midiNote);
            const isHovered = hoveredKey === key.midiNote;
            
            return (
              <motion.div
                key={key.midiNote}
                className={`
                  absolute top-0 rounded-b-lg cursor-pointer transition-all z-10
                  ${isPressed 
                    ? 'bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.8)]' 
                    : isGuide
                      ? 'bg-amber-500 border-amber-400'
                      : isHovered
                        ? 'bg-gray-600'
                        : 'bg-gray-900 border-b-2 border-gray-950'
                  }
                `}
                style={{
                  left: `${key.position}px`,
                  width: '24px',
                  height: '100px',
                }}
                animate={isPressed ? {
                  scaleY: 0.95,
                  y: 3,
                } : {
                  scaleY: 1,
                  y: 0,
                }}
                transition={{ duration: 0.1 }}
                onMouseEnter={() => setHoveredKey(key.midiNote)}
                onMouseLeave={() => setHoveredKey(null)}
                onMouseDown={() => onKeyDown?.(key.midiNote)}
                onMouseUp={() => onKeyUp?.(key.midiNote)}
                onMouseOut={() => {
                  // マウスが鍵盤の外に出た場合も音を止める
                  if (isPressed) {
                    onKeyUp?.(key.midiNote);
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}