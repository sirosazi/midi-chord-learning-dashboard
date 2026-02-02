import { useState, useEffect, useCallback } from "react";
import { TopNav } from "@/app/components/TopNav";
import { ChordDisplay } from "@/app/components/ChordDisplay";
import { PianoKeyboard } from "@/app/components/PianoKeyboard";
import { MidiLoadTab } from "@/app/components/MidiLoadTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { detectChord } from "@/app/utils/chord-detector";
import { audioEngine } from "@/app/utils/audio-engine";
import { keyboardToMidi } from "@/app/utils/keyboard-mapping";

function App() {
  // MIDI状態管理
  const [midiAccess, setMidiAccess] =
    useState<MIDIAccess | null>(null);
  const [midiInputs, setMidiInputs] = useState<MIDIInput[]>([]);
  const [selectedMidiInput, setSelectedMidiInput] =
    useState<string>("");
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(
    new Set(),
  );

  // コード検出
  const [currentChord, setCurrentChord] = useState({
    name: "",
    intervals: [] as string[],
  });

  // タブ・ガイド（MIDI読み込みタブ用）
  const [activeTab, setActiveTab] = useState("free");
  const [guideEnabled, setGuideEnabled] = useState(false);
  const [guideKeys, setGuideKeys] = useState<number[]>([]);

  // 緊急停止: コンポーネントがアンマウントされたら全ての音を止める
  useEffect(() => {
    return () => {
      audioEngine.stopAll();
    };
  }, []);

  // グローバルマウスアップイベントで確実に音を止める
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      audioEngine.stopAll();
      setPressedKeys(new Set());
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener(
        "mouseup",
        handleGlobalMouseUp,
      );
    };
  }, []);

  // Web MIDI APIの初期化
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      console.warn(
        "Web MIDI API is not supported in this browser",
      );
      return;
    }

    console.log("Requesting MIDI access...");
    navigator
      .requestMIDIAccess()
      .then((access) => {
        console.log("MIDI access granted!", access);
        setMidiAccess(access);
        updateMidiInputs(access);

        // デバイスの接続/切断を監視
        access.addEventListener("statechange", () => {
          console.log("MIDI state changed");
          updateMidiInputs(access);
        });
      })
      .catch((error) => {
        console.warn(
          "MIDI is not available in this environment:",
          error.message,
        );
        console.info(
          "You can still use the on-screen piano keyboard to play notes.",
        );
        // エラーが出てもアプリは正常に動作する
      });
  }, []);

  // MIDIインプットリストを更新
  const updateMidiInputs = (access: MIDIAccess) => {
    const inputs = Array.from(access.inputs.values());
    console.log(
      "MIDI inputs found:",
      inputs.length,
      inputs.map((i) => i.name),
    );
    setMidiInputs(inputs);

    // 自動的に最初のデバイスを選択
    if (inputs.length > 0 && !selectedMidiInput) {
      const firstInputId = inputs[0].id || "";
      console.log(
        "Auto-selecting first MIDI input:",
        inputs[0].name,
        firstInputId,
      );
      setSelectedMidiInput(firstInputId);
    }
  };

  // MIDIメッセージハンドラー
  const handleMidiMessage = useCallback(
    (event: MIDIMessageEvent) => {
      const [status, note, velocity] = event.data;
      const command = status >> 4;

      if (command === 9 && velocity > 0) {
        // Note On
        setPressedKeys((prev) => new Set(prev).add(note));
        audioEngine.playNote(note, velocity);
      } else if (
        command === 8 ||
        (command === 9 && velocity === 0)
      ) {
        // Note Off
        setPressedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(note);
          return newSet;
        });
        audioEngine.stopNote(note);
      }
    },
    [],
  );

  // 選択されたMIDIデバイスにリスナーを設定
  useEffect(() => {
    if (!midiAccess || !selectedMidiInput) return;

    const input = midiAccess.inputs.get(selectedMidiInput);
    if (!input) return;

    input.addEventListener(
      "midimessage",
      handleMidiMessage as any,
    );

    return () => {
      input.removeEventListener(
        "midimessage",
        handleMidiMessage as any,
      );
    };
  }, [midiAccess, selectedMidiInput, handleMidiMessage]);

  // 押された鍵盤が変わるたびにコードを検出
  useEffect(() => {
    const notesArray = Array.from(pressedKeys);
    const detectedChord = detectChord(notesArray);
    setCurrentChord({
      name: detectedChord.name,
      intervals: detectedChord.intervals,
    });
  }, [pressedKeys]);

  // ピアノ鍵盤のクリックハンドラー
  const handleKeyClick = useCallback(
    (midiNote: number) => {
      if (pressedKeys.has(midiNote)) {
        // すでに押されている場合は離す
        setPressedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(midiNote);
          return newSet;
        });
        audioEngine.stopNote(midiNote);
      } else {
        // 新しく押す
        setPressedKeys((prev) => new Set(prev).add(midiNote));
        audioEngine.playNote(midiNote, 100);
      }
    },
    [pressedKeys],
  );

  // キーボード入力ハンドラー
  useEffect(() => {
    const pressedKeyboardKeys = new Set<string>();

    const handleKeyPress = (event: KeyboardEvent) => {
      // 入力欄などでのタイピングを除外
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const midiNote = keyboardToMidi[key];
      
      // すでに押されているキーは無視（リピート防止）
      if (midiNote && !pressedKeyboardKeys.has(key)) {
        pressedKeyboardKeys.add(key);
        setPressedKeys((prev) => new Set(prev).add(midiNote));
        audioEngine.playNote(midiNote, 100);
      }
    };

    const handleKeyRelease = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const midiNote = keyboardToMidi[key];
      
      if (midiNote) {
        pressedKeyboardKeys.delete(key);
        setPressedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(midiNote);
          return newSet;
        });
        audioEngine.stopNote(midiNote);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("keyup", handleKeyRelease);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("keyup", handleKeyRelease);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#121212] text-white overflow-hidden">
      <TopNav
        midiInputs={midiInputs}
        selectedMidiInput={selectedMidiInput}
        onMidiInputChange={setSelectedMidiInput}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-4 border-b border-gray-800">
          <TabsList className="bg-gray-800/80">
            <TabsTrigger value="free" className="data-[state=active]:bg-cyan-600">
              フリー練習
            </TabsTrigger>
            <TabsTrigger value="midi" className="data-[state=active]:bg-cyan-600">
              MIDI読み込み
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsContent value="free" className="m-0 flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="flex flex-col">
              <div className="px-8 py-6 bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
                <ChordDisplay
                  chordName={currentChord.name}
                  intervals={currentChord.intervals}
                />
              </div>
              <div className="px-8 pb-8 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] overflow-x-auto">
                <PianoKeyboard
                  pressedKeys={Array.from(pressedKeys)}
                  guideKeys={[]}
                  onKeyDown={handleKeyClick}
                  onKeyUp={handleKeyClick}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="midi" className="m-0 flex-1 flex flex-col min-h-0 overflow-y-auto">
            {/* 高さは子の合計にし、スクロールでキーボードまで届くようにする */}
            <div className="flex flex-col">
              <div className="flex-shrink-0">
                <MidiLoadTab
                  guideEnabled={guideEnabled}
                  setGuideEnabled={setGuideEnabled}
                  setGuideKeys={setGuideKeys}
                />
              </div>
              <div className="flex-shrink-0 px-8 py-4 bg-gradient-to-b from-[#1a1a1a] to-[#121212]">
                <ChordDisplay
                  chordName={currentChord.name}
                  intervals={currentChord.intervals}
                  size="compact"
                />
              </div>
              <div className="flex-shrink-0 px-8 pb-8 bg-gradient-to-b from-[#121212] to-[#0a0a0a] overflow-x-auto">
                <PianoKeyboard
                  pressedKeys={Array.from(pressedKeys)}
                  guideKeys={guideKeys}
                  onKeyDown={handleKeyClick}
                  onKeyUp={handleKeyClick}
                />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default App;