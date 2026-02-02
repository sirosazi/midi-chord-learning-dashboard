import { chordNameToNotes, midiNoteToNoteName, midiNoteToStaffPosition } from "@/app/utils/chord-detector";
import { audioEngine } from "@/app/utils/audio-engine";
import { MusicalStaff } from "@/app/components/MusicalStaff";
import type { ChordProgressionItem } from "@/app/components/MidiFileAnalyzer";
import { Play, ChevronRight } from "lucide-react";

interface PracticeListenChordProps {
  progression: ChordProgressionItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function PracticeListenChord({
  progression,
  currentIndex,
  onIndexChange,
}: PracticeListenChordProps) {
  if (progression.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>先に「MIDIを開く」タブでコード進行を読み込んでください</p>
      </div>
    );
  }

  const current = progression[currentIndex];
  const notes = current ? chordNameToNotes(current.chord, 4) : [];
  const staffNotes = notes.map((midi) => ({
    pitch: midiNoteToNoteName(midi),
    position: midiNoteToStaffPosition(midi),
  }));

  const handlePlay = () => {
    if (notes.length === 0) return;
    audioEngine.playChord(notes, 1200, 100);
  };

  const handleNext = () => {
    onIndexChange(Math.min(currentIndex + 1, progression.length - 1));
  };

  const handlePrev = () => {
    onIndexChange(Math.max(currentIndex - 1, 0));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">正解のコード音だけ再生して聴く</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-500">
          {currentIndex + 1} / {progression.length}
        </span>
        <span className="text-3xl font-bold text-cyan-400">{current?.chord ?? "—"}</span>
      </div>
      <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
        <MusicalStaff notes={staffNotes} />
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40"
        >
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <button
          type="button"
          onClick={handlePlay}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500"
        >
          <Play className="w-5 h-5" />
          正解音を再生
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex >= progression.length - 1}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
