import { useState, useEffect, useRef } from "react";
import { Midi } from "@tonejs/midi";
import { Upload, Music, Play, Square, Pause } from "lucide-react";
import { chordNameToNotes } from "@/app/utils/chord-detector";
import { audioEngine } from "@/app/utils/audio-engine";
import { parseMidiToChordProgression, type ChordProgressionItem } from "@/app/components/MidiFileAnalyzer";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";

const DEFAULT_BPM = 120;
const BPM_MIN = 40;
const BPM_MAX = 240;
const SPEED_OPTIONS = [1, 0.75, 0.5, 0.25] as const;
const KEYBOARD_MIDI_MIN = 36;  // C2
const KEYBOARD_MIDI_MAX = 84;  // C6

interface MidiLoadTabProps {
  guideEnabled: boolean;
  setGuideEnabled: (v: boolean) => void;
  setGuideKeys: (keys: number[]) => void;
}

export function MidiLoadTab({ guideEnabled, setGuideEnabled, setGuideKeys }: MidiLoadTabProps) {
  const [chordProgression, setChordProgression] = useState<ChordProgressionItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileBpm, setFileBpm] = useState<number | null>(null);
  const [midiBaseBpm, setMidiBaseBpm] = useState(DEFAULT_BPM);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [mp3FileName, setMp3FileName] = useState("");
  const [mp3Enabled, setMp3Enabled] = useState(true);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const effectiveFileBpm = fileBpm ?? DEFAULT_BPM;
  const midiPlaybackRate = effectiveFileBpm > 0
    ? (midiBaseBpm / effectiveFileBpm) * speedMultiplier
    : speedMultiplier;

  function getBpmFromMidi(arrayBuffer: ArrayBuffer): number | null {
    try {
      const midi = new Midi(arrayBuffer);
      const bpm = midi.header.tempos[0]?.bpm;
      return typeof bpm === "number" && bpm > 0 ? Math.round(bpm) : null;
    } catch {
      return null;
    }
  }

  // MIDIファイル読み込み
  const handleMidiSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsAnalyzing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bpm = getBpmFromMidi(arrayBuffer);
      setFileBpm(bpm);
      setMidiBaseBpm(bpm ?? DEFAULT_BPM);
      const progression = parseMidiToChordProgression(arrayBuffer, (msg) => console.log(msg));
      setChordProgression(progression);
      setCurrentIndex(0);
    } catch (err) {
      console.error(err);
      alert("MIDIの解析に失敗しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // codetest.mid
  const handleLoadCodetest = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/codetest.mid");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const arrayBuffer = await res.arrayBuffer();
      const bpm = getBpmFromMidi(arrayBuffer);
      setFileBpm(bpm);
      setMidiBaseBpm(bpm ?? DEFAULT_BPM);
      const progression = parseMidiToChordProgression(arrayBuffer, (msg) => console.log(msg));
      setChordProgression(progression);
      setFileName("codetest.mid");
      setCurrentIndex(0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // MP3ファイル読み込み
  const handleMp3Select = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mp3Url) URL.revokeObjectURL(mp3Url);
    const url = URL.createObjectURL(file);
    setMp3Url(url);
    setMp3FileName(file.name);
    audioRef.current = new Audio(url);
  };

  // 指定インデックスまでの経過秒数を計算（MIDI用の rate のみ使用）
  function getElapsedSecondsUpToIndex(index: number): number {
    let sum = 0;
    for (let i = 0; i < index && i < chordProgression.length; i++) {
      sum += chordProgression[i].duration / midiPlaybackRate;
    }
    return sum;
  }

  // 再生（先頭から）
  const handlePlay = () => {
    if (chordProgression.length === 0) return;
    audioEngine.stopAll();
    startTimeRef.current = Date.now();
    setCurrentIndex(0);
    setIsPlaying(true);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.playbackRate = speedMultiplier;
      if (mp3Enabled) audioRef.current.play().catch(() => {});
    }
  };

  // 指定コードから再生開始
  const handlePlayFromIndex = (index: number) => {
    if (chordProgression.length === 0 || index < 0 || index >= chordProgression.length) return;
    audioEngine.stopAll();
    const elapsedSec = getElapsedSecondsUpToIndex(index);
    startTimeRef.current = Date.now() - elapsedSec * 1000;
    setCurrentIndex(index);
    setIsPlaying(true);
    setIsPaused(false);
    if (audioRef.current) {
      audioRef.current.currentTime = elapsedSec;
      audioRef.current.playbackRate = speedMultiplier;
      if (mp3Enabled) audioRef.current.play().catch(() => {});
    }
  };

  const tick = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    let sum = 0;
    for (let i = 0; i < chordProgression.length; i++) {
      const d = chordProgression[i].duration / midiPlaybackRate;
      if (sum + d > elapsed) {
        setCurrentIndex(i);
        return;
      }
      sum += d;
    }
    setCurrentIndex(chordProgression.length - 1);
    setIsPlaying(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    audioEngine.stopAll();
    if (audioRef.current) audioRef.current.pause();
  };

  // 一時停止
  const handlePause = () => {
    setIsPaused(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioRef.current) audioRef.current.pause();
  };

  // 再開
  const handleResume = () => {
    const elapsedSec = getElapsedSecondsUpToIndex(currentIndex);
    startTimeRef.current = Date.now() - elapsedSec * 1000;
    if (audioRef.current) {
      audioRef.current.currentTime = elapsedSec;
      if (mp3Enabled) audioRef.current.play().catch(() => {});
    }
    setIsPaused(false);
  };

  // 停止
  const handleStop = () => {
    setIsPlaying(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    audioEngine.stopAll();
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // 再生中かつ一時停止でないとき: 経過時間で currentIndex を更新
  useEffect(() => {
    if (!isPlaying || isPaused || chordProgression.length === 0) return;

    intervalRef.current = setInterval(tick, 50);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, isPaused, chordProgression, midiPlaybackRate]);

  // インデックスが変わったらそのコードを再生
  useEffect(() => {
    if (!isPlaying || chordProgression.length === 0) return;
    const item = chordProgression[currentIndex];
    if (!item) return;
    audioEngine.stopAll();
    const notes = chordNameToNotes(item.chord, 4);
    const durationMs = (item.duration / midiPlaybackRate) * 1000;
    audioEngine.playChord(notes, Math.min(durationMs, 2000), 90);
  }, [currentIndex, isPlaying, chordProgression, midiPlaybackRate]);

  // ガイド: 現在コードの鍵を親に通知（MIDIタブのみ・ガイドON時・鍵盤範囲内のみ）
  useEffect(() => {
    if (!guideEnabled || chordProgression.length === 0) {
      setGuideKeys([]);
      return;
    }
    const item = chordProgression[currentIndex];
    const chordName = item?.chord?.trim();
    if (!chordName) {
      setGuideKeys([]);
      return;
    }
    try {
      const notes = chordNameToNotes(chordName, 4);
      const inRange = notes.filter((n) => n >= KEYBOARD_MIDI_MIN && n <= KEYBOARD_MIDI_MAX);
      setGuideKeys(inRange);
    } catch {
      setGuideKeys([]);
    }
  }, [guideEnabled, chordProgression, currentIndex, setGuideKeys]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mp3Url) URL.revokeObjectURL(mp3Url);
    };
  }, [mp3Url]);

  // 速度変更時にMP3のplaybackRateを更新（speedMultiplier のみ）
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speedMultiplier;
  }, [speedMultiplier]);

  // MP3 ON/OFFトグル時: 再生中なら再生または一時停止
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying && !isPaused) {
      if (mp3Enabled) {
        const elapsedSec = getElapsedSecondsUpToIndex(currentIndex);
        audioRef.current.currentTime = elapsedSec;
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [mp3Enabled]);

  const currentChord = chordProgression[currentIndex];

  return (
    <div className="space-y-6 p-6">
      {/* ファイル読み込み：常に見えるように先頭に固定表示 */}
      <div className="sticky top-0 z-10 -m-6 p-6 pb-4 bg-[#121212] border-b border-gray-800 space-y-4">
        <p className="text-sm text-gray-400">
          Studio One のコードトラック／和音として再配置して書き出した MIDI にも対応しています。
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>MIDIを開く</span>
            <input type="file" accept=".mid,.midi" onChange={handleMidiSelect} className="hidden" />
          </label>
          <button
            type="button"
            onClick={handleLoadCodetest}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
          >
            <Music className="w-4 h-4" />
            codetest.mid
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>MP3を開く</span>
            <input type="file" accept=".mp3,audio/mpeg" onChange={handleMp3Select} className="hidden" />
          </label>
          {mp3FileName && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">MP3: {mp3FileName}</span>
              <div className="flex items-center gap-2">
                <Switch
                  id="mp3-enabled"
                  checked={mp3Enabled}
                  onCheckedChange={setMp3Enabled}
                />
                <Label htmlFor="mp3-enabled" className="text-sm text-gray-400 cursor-pointer">
                  MP3再生
                </Label>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAnalyzing && (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          解析中...
        </div>
      )}

      {fileName && !isAnalyzing && (
        <div className="text-sm text-gray-500">📄 {fileName}</div>
      )}

      {/* MIDIの元BPM・速度・ガイド（コード読み込み後のみ） */}
      {chordProgression.length > 0 && (
        <div className="flex flex-wrap items-center gap-6">
          {/* MIDIの元BPM（MP3は変えず、MIDI進行のみに反映） */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">MIDIの元BPM</span>
            <button
              type="button"
              onClick={() => setMidiBaseBpm((b) => Math.max(BPM_MIN, b - 1))}
              className="px-2 py-1 rounded text-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
              disabled={midiBaseBpm <= BPM_MIN}
            >
              −
            </button>
            <span className="min-w-[2.5rem] text-center font-mono text-white">{midiBaseBpm}</span>
            <button
              type="button"
              onClick={() => setMidiBaseBpm((b) => Math.min(BPM_MAX, b + 1))}
              className="px-2 py-1 rounded text-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50"
              disabled={midiBaseBpm >= BPM_MAX}
            >
              +
            </button>
            {fileBpm != null ? (
              <span className="text-xs text-gray-500">（ファイル: {fileBpm}）</span>
            ) : (
              <span className="text-xs text-gray-500">（ファイルにBPMなし→{DEFAULT_BPM}で計算）</span>
            )}
          </div>
          {/* 速度（MIDI・MP3両方に反映） */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">速度</span>
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSpeedMultiplier(rate)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  speedMultiplier === rate ? "bg-cyan-600 text-white" : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {rate === 1 ? "等倍" : `${rate}倍速`}
              </button>
            ))}
          </div>
          {/* ガイド（MIDI読み込みタブのみ表示） */}
          <div className="flex items-center gap-2">
            <Switch
              id="guide-enabled"
              checked={guideEnabled}
              onCheckedChange={setGuideEnabled}
            />
            <Label htmlFor="guide-enabled" className="text-sm text-gray-400 cursor-pointer">
              ガイド
            </Label>
          </div>
        </div>
      )}

      {/* コード一覧（横並び）・常時表示 */}
      {chordProgression.length > 0 && (
        <>
          {/* 現在のコードを大きく表示 */}
          <div className="text-center py-4">
            <span className="text-4xl font-bold text-cyan-400">
              {currentChord?.chord ?? "—"}
            </span>
          </div>

          {/* 横並びコードストリップ（クリックでそのコードから再生） */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-px min-w-max">
              {chordProgression.map((item, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handlePlayFromIndex(index)}
                  className={`flex-shrink-0 px-3 py-2 rounded border transition-all text-left cursor-pointer ${
                    index === currentIndex
                      ? "bg-cyan-600 border-cyan-400 text-white text-lg font-bold scale-105"
                      : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {item.chord}
                </button>
              ))}
            </div>
          </div>

          {/* 再生・一時停止・停止 */}
          <div className="flex gap-4">
            {!isPlaying ? (
              <button
                type="button"
                onClick={handlePlay}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl"
              >
                <Play className="w-5 h-5" />
                再生
              </button>
            ) : isPaused ? (
              <>
                <button
                  type="button"
                  onClick={handleResume}
                  className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl"
                >
                  <Play className="w-5 h-5" />
                  再開
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl"
                >
                  <Square className="w-5 h-5" />
                  停止
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl"
                >
                  <Pause className="w-5 h-5" />
                  一時停止
                </button>
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl"
                >
                  <Square className="w-5 h-5" />
                  停止
                </button>
              </>
            )}
          </div>
        </>
      )}

      {chordProgression.length === 0 && !isAnalyzing && (
        <div className="text-center py-12 text-gray-500">
          <p>MIDIファイルを開くか「codetest.mid」でコード進行を読み込んでください</p>
        </div>
      )}
    </div>
  );
}
