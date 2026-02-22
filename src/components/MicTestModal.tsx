import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";

interface MicTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MicTestModal: React.FC<MicTestModalProps> = ({ isOpen, onClose }) => {
  const [isTesting, setIsTesting] = useState(false);
  const [level, setLevel] = useState(0);
  const [hasVoice, setHasVoice] = useState(false);
  const [error, setError] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    dataRef.current = null;
  }, []);

  const stopTest = useCallback(() => {
    cleanupAudio();
    setIsTesting(false);
    setLevel(0);
    setHasVoice(false);
  }, [cleanupAudio]);

  const startTest = useCallback(async () => {
    cleanupAudio();
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const audioContextCtor =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!audioContextCtor) {
        throw new Error("audio_context_unavailable");
      }

      const audioContext = new audioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.86;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataRef.current = buffer;
      setIsTesting(true);

      const tick = () => {
        const currentAnalyser = analyserRef.current;
        const currentData = dataRef.current;
        if (!currentAnalyser || !currentData) {
          return;
        }

        currentAnalyser.getByteTimeDomainData(currentData);
        let sum = 0;
        for (let i = 0; i < currentData.length; i += 1) {
          const v = (currentData[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / currentData.length);
        const normalized = Math.max(0, Math.min(1, (rms - 0.01) / 0.08));

        setLevel((prev) => prev * 0.72 + normalized * 0.28);
        setHasVoice(rms > 0.03);
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (e) {
      console.error("Mic test failed", e);
      setError("마이크 테스트를 시작할 수 없습니다. 브라우저 권한 설정을 확인해 주세요.");
      stopTest();
    }
  }, [cleanupAudio, stopTest]);

  useEffect(() => {
    if (!isOpen) {
      stopTest();
    }
  }, [isOpen, stopTest]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/60 bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#1F2937]">
            <Mic size={18} />
            <h3 className="text-[16px] font-semibold">마이크 테스트</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="마이크 테스트 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-[13px] leading-5 text-slate-600 break-keep">
          아래 버튼을 누르고 2~3초간 말해보세요. 입력 신호가 감지되면 상태가 변경됩니다.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-150 ${hasVoice ? "bg-emerald-500" : "bg-orange-400"}`}
              style={{ width: `${Math.max(4, Math.round(level * 100))}%` }}
            />
          </div>
          <p className={`mt-2 text-[12px] font-medium ${hasVoice ? "text-emerald-600" : "text-slate-600"}`}>
            {isTesting ? (hasVoice ? "음성 입력이 감지되고 있습니다." : "소리를 기다리는 중입니다.") : "테스트 대기 중"}
          </p>
          {error && <p className="mt-2 text-[12px] leading-5 text-rose-600 break-keep">{error}</p>}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={isTesting ? stopTest : startTest}
            className={`flex-1 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white transition-colors ${isTesting ? "bg-slate-600 hover:bg-slate-700" : "bg-[#1D2D4A] hover:bg-[#263b60]"}`}
          >
            {isTesting ? "테스트 중지" : "테스트 시작"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-[14px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default MicTestModal;
