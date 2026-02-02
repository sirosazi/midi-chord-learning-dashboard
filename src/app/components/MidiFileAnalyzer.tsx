import { useState } from "react";
import { Midi } from "@tonejs/midi";
import { Upload, Music } from "lucide-react";
import { detectChord } from "@/app/utils/chord-detector";

export interface ChordProgressionItem {
  time: number;
  chord: string;
  duration: number;
}

/** MIDIのArrayBufferからコード進行を解析（和音→コード再検出）。Studio Oneの「和音として再配置」で書き出したMIDIにも対応。 */
export function parseMidiToChordProgression(
  arrayBuffer: ArrayBuffer,
  addLog: (message: string) => void,
  timeStep: number = 0.25
): ChordProgressionItem[] {
  const midi = new Midi(arrayBuffer);
  addLog(`✅ MIDIパース成功: ${midi.tracks.length} tracks, ${midi.duration.toFixed(2)}秒`);

  const progression: ChordProgressionItem[] = [];
  const allNotes: Array<{ time: number; midi: number; duration: number }> = [];

  midi.tracks.forEach((track, trackIndex) => {
    addLog(`📊 Track ${trackIndex}: ${track.notes.length} notes`);
    track.notes.forEach(note => {
      allNotes.push({
        time: note.time,
        midi: note.midi,
        duration: note.duration
      });
    });
  });

  addLog(`🎹 合計ノート数: ${allNotes.length}`);
  if (allNotes.length === 0) {
    addLog("⚠️ ノートが見つかりませんでした");
    return progression;
  }

  allNotes.sort((a, b) => a.time - b.time);
  const maxTime = Math.max(...allNotes.map(n => n.time + n.duration));
  addLog(`⏱️ 総演奏時間: ${maxTime.toFixed(2)}秒`);

  let samplesWithMultipleNotes = 0;
  for (let time = 0; time < maxTime; time += timeStep) {
    const activeNotes = allNotes
      .filter(note => note.time <= time && note.time + note.duration > time)
      .map(note => note.midi);

    if (activeNotes.length >= 2) {
      samplesWithMultipleNotes++;
      if (samplesWithMultipleNotes <= 10) {
        const chord = detectChord(activeNotes);
        addLog(`🎹 ${time.toFixed(2)}s: ${activeNotes.length}音 [${activeNotes.join(", ")}] → "${chord.name}"`);
      }
      const chord = detectChord(activeNotes);
      if (chord.name) {
        const lastItem = progression[progression.length - 1];
        if (lastItem && lastItem.chord === chord.name) {
          lastItem.duration += timeStep;
        } else {
          progression.push({ time, chord: chord.name, duration: timeStep });
        }
      }
    }
  }

  addLog(`🎼 検出されたコード数: ${progression.length}`);
  if (progression.length > 0) {
    addLog(`コード進行: ${progression.slice(0, 10).map(p => p.chord).join(", ")}${progression.length > 10 ? "..." : ""}`);
  }
  return progression;
}

interface MidiFileAnalyzerProps {
  onProgressionLoaded?: (progression: ChordProgressionItem[]) => void;
}

export function MidiFileAnalyzer({ onProgressionLoaded }: MidiFileAnalyzerProps) {
  const [chordProgression, setChordProgression] = useState<ChordProgressionItem[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setDebugLog(prev => [...prev, message]);
  };

  const runAnalysis = (arrayBuffer: ArrayBuffer, name: string) => {
    setDebugLog([]);
    setIsAnalyzing(true);
    setFileName(name);
    try {
      addLog("📖 ファイルを読み込み中...");
      addLog(`✅ ArrayBuffer取得成功: ${arrayBuffer.byteLength} bytes`);
      addLog("🎵 MIDIパース中...");
      const progression = parseMidiToChordProgression(arrayBuffer, addLog);
      setChordProgression(progression);
      onProgressionLoaded?.(progression);
    } catch (error) {
      addLog(`❌ エラー: ${error instanceof Error ? error.message : String(error)}`);
      alert(`MIDIファイルの解析に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAnalyzing(false);
      addLog("✅ 解析処理完了");
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      addLog("❌ ファイルが選択されていません");
      return;
    }
    addLog(`📂 ファイル選択: ${file.name}`);
    const arrayBuffer = await file.arrayBuffer();
    runAnalysis(arrayBuffer, file.name);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // テスト用MIDIファイルを生成
  const generateTestMidi = () => {
    addLog("🎼 テストMIDIを生成中...");
    setDebugLog([]);
    
    const midi = new Midi();
    const track = midi.addTrack();
    
    // C → Am → F → G のコード進行を生成
    const chords = [
      { name: "C", notes: [60, 64, 67], time: 0 },      // C (C, E, G)
      { name: "Am", notes: [57, 60, 64], time: 2 },     // Am (A, C, E)
      { name: "F", notes: [53, 57, 60], time: 4 },      // F (F, A, C)
      { name: "G", notes: [55, 59, 62], time: 6 },      // G (G, B, D)
    ];
    
    chords.forEach(chord => {
      addLog(`追加: ${chord.name} (${chord.notes.join(", ")})`);
      chord.notes.forEach(note => {
        track.addNote({
          midi: note,
          time: chord.time,
          duration: 1.8,  // 少し重ねる
          velocity: 0.8
        });
      });
    });
    
    addLog(`✅ テストMIDI生成完了: ${chords.length}個のコード`);
    
    // MIDIをダウンロード
    const blob = new Blob([midi.toArray()], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test-chords.mid";
    a.click();
    URL.revokeObjectURL(url);
    
    addLog("💾 test-chords.mid をダウンロードしました");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Studio One のコードトラック／和音として再配置して書き出した MIDI にも対応しています。和音からコードを再検出して表示します。
      </p>
      {/* ファイル選択ボタン */}
      <label className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl">
        <Upload className="w-5 h-5" />
        <span className="font-semibold">MIDIファイルを開く</span>
        <input
          type="file"
          accept=".mid,.midi"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>
      {/* 分析中表示 */}
      {isAnalyzing && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-400">分析中...</p>
        </div>
      )}

      {/* ファイル名表示 */}
      {fileName && !isAnalyzing && (
        <div className="text-sm text-gray-400">
          📄 {fileName}
        </div>
      )}

      {/* コード進行表示 */}
      {chordProgression.length > 0 && !isAnalyzing && (
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-blue-400 mb-4">
            コード進行 ({chordProgression.length}個のコード)
          </h3>
          
          <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
            {chordProgression.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500 w-16">
                    {formatTime(item.time)}
                  </span>
                  <span className="font-bold text-xl text-blue-400">
                    {item.chord}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {item.duration.toFixed(2)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 初期状態メッセージ */}
      {chordProgression.length === 0 && !isAnalyzing && !fileName && (
        <div className="text-center py-12 text-gray-500">
          <p className="mb-2">MIDIファイルからコード進行を解析</p>
          <p className="text-sm">ファイルを選択してコード進行を解析できます</p>
        </div>
      )}

      {/* デバッグログ表示 */}
      {debugLog.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-gray-400">デバッグログ</h4>
          <div className="max-h-48 overflow-y-auto bg-gray-800/50 p-2 rounded-lg">
            {debugLog.map((log, index) => (
              <p key={index} className="text-xs text-gray-500">
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* テストMIDI生成ボタン */}
      <button
        className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl"
        onClick={generateTestMidi}
      >
        <Music className="w-5 h-5" />
        <span className="font-semibold">テストMIDIを生成</span>
      </button>
    </div>
  );
}