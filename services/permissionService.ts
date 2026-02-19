export const requestMicPermission = async (): Promise<boolean> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately, checks only for permission
        stream.getTracks().forEach((track) => track.stop());
        return true;
    } catch (error) {
        console.error("Microphone permission denied:", error);
        return false;
    }
};

export const requestLocationPermission = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.error("Geolocation is not supported by this browser.");
            resolve(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            () => resolve(true),
            (error) => {
                console.error("Location permission denied:", error);
                resolve(false);
            }
        );
    });
};

export const requestWakeLock = async (): Promise<WakeLockSentinel | null> => {
    if ("wakeLock" in navigator) {
        try {
            const wakeLock = await navigator.wakeLock.request("screen");
            console.log("Wake Lock is active!");
            return wakeLock;
        } catch (err) {
            console.error(`${err.name}, ${err.message}`);
            return null;
        }
    }
    return null;
};
