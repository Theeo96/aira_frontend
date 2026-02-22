import { useEffect, useRef, useState, useCallback } from "react";
import { airaSocketService } from "../services/airaSocketService";

export const useAiraMedia = (
    isListening: boolean,
    isCameraOn: boolean,
    cameraStream: MediaStream | null,
    isScreenSharing: boolean, // if we added state for this later
    screenStream: MediaStream | null,
    onTranscript: (transcript: any) => void
) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Audio Queueing References
    const playbackContextRef = useRef<AudioContext | null>(null);
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isPlayingRef = useRef<boolean>(false);

    // Vision references
    const visionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        airaSocketService.setCallbacks(
            (pcmData, sampleRate) => {
                handleIncomingAudio(pcmData, sampleRate);
            },
            (transcript) => {
                onTranscript(transcript);
            }
        );
    }, [onTranscript]);

    const initPlaybackContext = () => {
        if (!playbackContextRef.current) {
            playbackContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000,
            });
        }
        if (playbackContextRef.current.state === "suspended") {
            playbackContextRef.current.resume();
        }
    };

    const handleIncomingAudio = (pcm16Data: Int16Array, sampleRate: number) => {
        initPlaybackContext();
        const ctx = playbackContextRef.current!;
        const audioBuffer = ctx.createBuffer(1, pcm16Data.length, sampleRate);
        const float32Data = audioBuffer.getChannelData(0);

        // Int16 -> Float32 변환
        for (let i = 0; i < pcm16Data.length; i++) {
            const s = Math.max(-1, Math.min(1, pcm16Data[i] / 32768.0));
            float32Data[i] = s;
        }

        audioQueueRef.current.push(audioBuffer);
        playNextAudio();
    };

    const playNextAudio = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

        isPlayingRef.current = true;
        const ctx = playbackContextRef.current;
        if (!ctx) return;

        if (ctx.state === "suspended") {
            await ctx.resume();
        }

        const buffer = audioQueueRef.current.shift();
        if (!buffer) {
            isPlayingRef.current = false;
            return;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.onended = () => {
            isPlayingRef.current = false;
            playNextAudio();
        };
        source.start();
    };

    // --- Microphone Capture ---
    useEffect(() => {
        if (isListening) {
            startRecording();
        } else {
            stopRecording();
            // stop recording -> clear backend audio buffers maybe? (Depends on backend, typically just stop sending)
        }

        return () => {
            stopRecording();
        };
    }, [isListening]);

    const startRecording = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                    sampleRate: 16000,
                });
            }
            if (audioContextRef.current.state === "suspended") {
                await audioContextRef.current.resume();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(2048, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (e) => {
                if (!isListening) return; // double check state
                const inputData = e.inputBuffer.getChannelData(0);

                // Float32 -> Int16
                const pcm16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                airaSocketService.sendAudioContent(pcm16);
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current.destination);

        } catch (e) {
            console.error("Microphone capture failed", e);
        }
    };

    const stopRecording = () => {
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };


    // --- Vision Capture (FPS) ---
    const captureFrame = useCallback((stream: MediaStream, type: "camera_frame" | "screen_frame") => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play().catch(() => { });

        video.onloadedmetadata = () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                let base64Jpeg = canvas.toDataURL("image/jpeg", 0.8);
                airaSocketService.sendVisionFrame(type, base64Jpeg);

                // Memory Leak GC Hint (From Backend suggestion)
                base64Jpeg = "";
            }
            // cleanup memory
            video.pause();
            video.srcObject = null;
            video.remove();
        };
    }, []);

    useEffect(() => {
        if (isCameraOn && cameraStream) {
            visionIntervalRef.current = setInterval(() => {
                captureFrame(cameraStream, "camera_frame");
            }, 1000); // 1 FPS
        } else if (isScreenSharing && screenStream) {
            visionIntervalRef.current = setInterval(() => {
                captureFrame(screenStream, "screen_frame");
            }, 1000);
        } else {
            if (visionIntervalRef.current) {
                clearInterval(visionIntervalRef.current);
                visionIntervalRef.current = null;
            }
        }

        return () => {
            if (visionIntervalRef.current) {
                clearInterval(visionIntervalRef.current);
                visionIntervalRef.current = null;
            }
        };
    }, [isCameraOn, cameraStream, isScreenSharing, screenStream, captureFrame]);

    return {
        // 훅 자체는 Effect로 동작하며, 외부로 노출할 State가 지금 당장 필요한 것은 아님
    };
};
