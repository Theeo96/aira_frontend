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
    const nextStartTimeRef = useRef<number>(0);
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
            float32Data[i] = pcm16Data[i] / 32768.0;
        }

        audioQueueRef.current.push(audioBuffer);

        // [핵심 1] Underrun(Starvation) 감지 로직
        // 이미 재생 중이었지만 큐가 늦게 도착해 예약된 시간이 과거로 밀렸다면 즉시 상태 초기화
        if (isPlayingRef.current && nextStartTimeRef.current < ctx.currentTime) {
            isPlayingRef.current = false;
        }

        // [핵심 2] Jitter Buffer (Pre-buffering)
        // 안 밀리게 최소 4조각이 모일 때까지 기다렸다가 방출
        if (!isPlayingRef.current) {
            if (audioQueueRef.current.length >= 4) {
                isPlayingRef.current = true;
                nextStartTimeRef.current = ctx.currentTime + 0.05; // 50ms 여유를 주고 시작
                scheduleAllAudio();
            }
        } else {
            // 이미 4개 이상 모여서 잘 재생되고 있으면 들어오는 대로 큐에 이어서 예약 발사
            scheduleAllAudio();
        }
    };

    // [핵심 3] currentTime 기반 끊김 없는 예약 스케줄링
    const scheduleAllAudio = () => {
        const ctx = playbackContextRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") {
            ctx.resume();
        }

        while (audioQueueRef.current.length > 0) {
            const buffer = audioQueueRef.current.shift();
            if (!buffer) continue;

            const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);

            source.start(startTime);
            nextStartTimeRef.current = startTime + buffer.duration;
        }
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
