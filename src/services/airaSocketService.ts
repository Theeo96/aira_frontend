type AudioChunkCallback = (audioData: Int16Array, sampleRate: number) => void;
type TranscriptCallback = (transcript: any) => void;

class AiraSocketService {
    private socket: WebSocket | null = null;
    private url: string = "wss://thimblelike-nonopprobrious-lannie.ngrok-free.dev/ws";
    private token: string | null = null;
    private isConnecting: boolean = false;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private onAudioChunk: AudioChunkCallback | null = null;
    private onTranscript: TranscriptCallback | null = null;

    public initialize(token: string) {
        this.token = token;
        this.connect();
    }

    public setCallbacks(
        onAudioChunk: AudioChunkCallback,
        onTranscript: TranscriptCallback
    ) {
        this.onAudioChunk = onAudioChunk;
        this.onTranscript = onTranscript;
    }

    private connect() {
        if (!this.token) return;
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.isConnecting = true;
        const socketUrl = `${this.url}?token=${encodeURIComponent(this.token)}`;
        console.log("Connecting to WebSocket:", socketUrl);

        // Blob 대신 arraybuffer를 사용하여 바이너리 직접 접근 용이성 확보
        this.socket = new WebSocket(socketUrl);
        this.socket.binaryType = "arraybuffer";

        this.socket.onopen = () => {
            console.log("WebSocket connection established");
            this.isConnecting = false;
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        };

        this.socket.onmessage = (event) => {
            if (typeof event.data === "string") {
                // Text Message (JSON expected)
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === "transcript" && this.onTranscript) {
                        this.onTranscript(payload);
                    }
                } catch (e) {
                    console.error("Failed to parse websocket JSON message:", e);
                }
            } else if (event.data instanceof ArrayBuffer) {
                // Binary Message (Audio PCM data expected)
                // 백엔드 명세상: 24000Hz, Mono, 16-bit PCM 송신
                const pcm16Data = new Int16Array(event.data);
                if (this.onAudioChunk) {
                    this.onAudioChunk(pcm16Data, 24000);
                }
            }
        };

        this.socket.onclose = () => {
            console.log("WebSocket connection closed");
            this.socket = null;
            this.isConnecting = false;
            this.scheduleReconnect();
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            // onclose event will naturally fire after onerror
        };
    }

    private scheduleReconnect() {
        if (!this.reconnectTimer && this.token) {
            this.reconnectTimer = setTimeout(() => {
                console.log("Attempting to reconnect WebSocket...");
                this.connect();
            }, 3000);
        }
    }

    public disconnect() {
        this.token = null;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
    }

    public sendAudioContent(pcm16Data: Int16Array) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(pcm16Data.buffer);
        }
    }

    public sendTextInput(text: string, imageB64?: string) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload: any = {
                type: "multimodal_input",
                text: text,
            };
            if (imageB64) {
                payload.image_b64 = imageB64;
            }
            this.socket.send(JSON.stringify(payload));
        } else {
            console.warn("WebSocket is NOT OPEN, cannot send text", text);
        }
    }

    public sendVisionFrame(type: "camera_frame" | "screen_frame", base64Jpeg: string) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload = {
                type: type,
                image_b64: base64Jpeg,
            };
            this.socket.send(JSON.stringify(payload));
        }
    }

    public sendCameraState(enabled: boolean) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload = {
                type: "camera_state",
                enabled: enabled,
            };
            this.socket.send(JSON.stringify(payload));
        }
    }

    public sendLocationUpdate(lat: number, lng: number) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const payload = {
                type: "location_update",
                lat: lat,
                lng: lng,
            };
            this.socket.send(JSON.stringify(payload));
        }
    }
}

export const airaSocketService = new AiraSocketService();
