import React, { useEffect, useRef } from 'react';

interface Note {
  pitch: string; // e.g., "C4", "E4", "G4"
  position: number; // Position on the staff (0-10, where 5 is middle line)
}

interface MusicalStaffProps {
  notes?: Note[];
  /** MIDIタブ用にコンパクト表示（高さ・線間を縮小） */
  compact?: boolean;
}

export function MusicalStaff({ notes = [], compact = false }: MusicalStaffProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const height = compact ? 120 : 200;
  const lineSpacing = compact ? 12 : 20;
  const clefFontSize = compact ? 80 : 100;
  const noteRadiusX = compact ? 6 : 8;
  const noteRadiusY = compact ? 5 : 6;
  const stemHeight = compact ? 28 : 35;
  const stemOffset = compact ? 4 : 7;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;

    ctx.clearRect(0, 0, width, height);

    const startY = height / 2 - lineSpacing * 2;

    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;

    for (let i = 0; i < 5; i++) {
      const y = startY + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(width - 50, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#4a5568';
    ctx.font = `bold ${clefFontSize}px serif`;
    ctx.fillText('𝄞', 55, startY + lineSpacing * 3.2);

    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 20;

    notes.forEach((note, index) => {
      const x = 200 + index * 60;
      const y = startY + lineSpacing * 4 - note.position * (lineSpacing　/ ) + 5;

      ctx.beginPath(); 
      ctx.ellipse(x, y, noteRadiusX, noteRadiusY, -0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(x + stemOffset, y - stemHeight, 2, stemHeight);
    });

    ctx.shadowBlur = 0;
  }, [notes, height, lineSpacing, clefFontSize, noteRadiusX, noteRadiusY, stemHeight, stemOffset]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={1200}
        height={height}
        className="w-full h-auto"
      />
    </div>
  );
}
