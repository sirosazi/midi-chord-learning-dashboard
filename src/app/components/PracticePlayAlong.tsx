import { useState, useEffect, useRef } from "react";
import { chordNameToNotes, midiNoteToNoteName, midiNoteToStaffPosition } from "@/app/utils/chord-detector";
import { audioEngine } from "@/app/utils/audio-engine";
import { MusicalStaff } from "@/app/components/MusicalStaff";
import type { ChordProgressionItem } from "@/app/components/MidiFileAnalyzer";
import { Play, Square } from "lucide-react";

interface PracticePlayAlongProps {
  progression: ChordProgressionItem[];
  currentChord: string; // ユーザーが弾いたコード（認識されたときのみ非空）
}

export function PracticePlayAlong({ progression, currentChord }: PracticePlayAlongProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const prevChordRef = useRef<string>("");

  // バック再生: 経過時間で currentIndex を更新し、コードを再生
  useEffect(() => {
    if (!isPlaying || progression.length === 0) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      elapsedRef.current = elapsed;
      let sum = 0;
      let nextIndex = 0;
      for (let i = 0; i < progression.length; i++) {
        if (sum + progression[i].duration > elapsed) {
          nextIndex = i;
          break;
        }
        sum += progression[i].duration;
        nextIndex = i + 1;
      }
      if (nextIndex >= progression.length) {
        setCurrentIndex(progression.length - 1);
        setIsPlaying(false);
        return;
      }
      setCurrentIndex(nextIndex);
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, progression]);

  // インデックスが変わったらそのコードを再生（前の音は止める）・判定用リセット
  useEffect(() => {
    if (!isPlaying || progression.length === 0) return;
    const item = progression[currentIndex];
    if (!item) return;
    prevChordRef.current = "";
    audioEngine.stopAll();
    const notes = chordNameToNotes(item.chord, 4);
    const durationMs = item.duration * 1000;
    audioEngine.playChord(notes, Math.min(durationMs, 2000), 90);
  }, [currentIndex, isPlaying, progression]);

  // コードが認識されたときだけ正誤判定（1音だけのときは判定しない）
  useEffect(() => {
    if (currentChord === "" || progression.length === 0) return;
    if (currentChord === prevChordRef.current) return;
    prevChordRef.current = currentChord;
    const expected = progression[currentIndex]?.chord ?? "";
    if (expected === "") return;
    setLastResult(currentChord === expected ? "correct" : "incorrect");
  }, [currentChord, currentIndex, progression]);

  const handleStart = () => {
    startTimeRef.current = Date.now();
    setCurrentIndex(0);
    setLastResult(null);
    prevChordRef.current = "";
    setIsPlaying(true);
  };

  const handleStop = () => {
    setIsPlaying(false);
    audioEngine.stopAll();
  };

  const current = progression[currentIndex];
  const notes = current ? chordNameToNotes(current.chord, 4) : [];
  const staffNotes = notes.map((midi) => ({
    pitch: midiNoteToNoteName(midi),
    position: midiNoteToStaffPosition(midi),
  }));

  if (progression.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>先に「MIDIを開く」タブでコード進行を読み込んでください</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-400">バックで流しながら、弾いたコードが合っているか確認</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-gray-500">
          {currentIndex + 1} / {progression.length}
        </span>
        <span className="text-2xl font-bold text-cyan-400">正解: {current?.chord ?? "—"}</span>
        {lastResult === "correct" && (
          <span className="text-3xl font-bold text-green-500">〇 正解</span>
        )}
        {lastResult === "incorrect" && (
          <span className="text-3xl font-bold text-red-500">× 不正解</span>
        )}
      </div>
      <div className="bg-gray-900/30 rounded-2xl p-6 border border-gray-800">
        <MusicalStaff notes={staffNotes} />
      </div>
      <div className="flex items-center gap-4">
        {!isPlaying ? (
          <button
            type="button"
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500"
          >
            <Play className="w-5 h-5" />
            再生して確認
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-500"
          >
            <Square className="w-5 h-5" />
            停止
          </button>
        )}
      </div>
    </div>
  );
}
