import { useCallback, useRef, useEffect } from "react";

export const useEarcon = (enabled: boolean = true) => {
    const audioCtxRef = useRef<AudioContext | null>(null);

    // Initialize AudioContext on first user interaction or when hook is mounted
    useEffect(() => {
        // We defer creation until needed to respect browser autoplay policies,
        // but the sounds are triggered by user clicks anyway.
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(console.error);
            }
        };
    }, []);

    const getCtx = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    const playTone = (freqs: number[], type: OscillatorType, duration: number, volume: number) => {
        if (!enabled) return;
        const ctx = getCtx();
        const now = ctx.currentTime;

        // Master Gain
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(volume, now + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        masterGain.connect(ctx.destination);

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, now + (idx * 0.1));
            osc.connect(masterGain);
            osc.start(now + (idx * 0.1));
            osc.stop(now + duration);
        });
    };

    const playSuccess = useCallback(() => {
        // Bright, crystalline chime (C5 -> E5 -> G5)
        // 523.25 Hz = C5, 659.25 Hz = E5, 783.99 Hz = G5
        playTone([523.25, 659.25, 783.99], "sine", 0.6, 0.2);
    }, []);

    return {
        playSuccess,
    };
};
