import React from "react";
import { Mic, Camera, MapPin } from "lucide-react";

export interface PermissionPageProps {
    onPermissionGrant: () => void;
    onPermissionDeny: () => void;
}

export const MicPermissionPage: React.FC<PermissionPageProps> = ({ onPermissionGrant, onPermissionDeny }) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
        <div className="bg-white w-full max-w-sm rounded-[40px] p-8 flex flex-col items-center shadow-2xl animate-slide-up">
            <Mic size={48} className="mb-6 text-black" />
            <p className="text-center font-bold mb-10 text-gray-800 text-lg leading-snug">
                AIRA에서 오디오를 녹음하도록
                <br />
                허용하시겠습니까?
            </p>
            <div className="w-full flex flex-col gap-3">
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    앱 사용 중에만 허용
                </button>
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    이번만 허용
                </button>
                <button
                    onClick={onPermissionDeny}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    허용 안 함
                </button>
            </div>
        </div>
    </div>
);

export const CameraPermissionPage: React.FC<PermissionPageProps> = ({ onPermissionGrant, onPermissionDeny }) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
        <div className="bg-white w-full max-w-sm rounded-[40px] p-8 flex flex-col items-center shadow-2xl animate-slide-up">
            <Camera size={48} className="mb-6 text-black" />
            <p className="text-center font-bold mb-10 text-gray-800 text-lg leading-snug">
                AIRA에서 사진과 동영상을
                <br />
                촬영하도록 허용하시겠습니까?
            </p>
            <div className="w-full flex flex-col gap-3">
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    앱 사용 중에만 허용
                </button>
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    이번만 허용
                </button>
                <button
                    onClick={onPermissionDeny}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    허용 안 함
                </button>
            </div>
        </div>
    </div>
);

export const LocationPermissionPage: React.FC<PermissionPageProps> = ({ onPermissionGrant, onPermissionDeny }) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
        <div className="bg-white w-full max-w-sm rounded-[40px] p-8 flex flex-col items-center shadow-2xl animate-slide-up">
            <MapPin size={48} className="mb-6 text-black" />
            <p className="text-center font-bold mb-10 text-gray-800 text-lg leading-snug">
                AIRA에서 기기의 위치에
                <br />
                액세스하도록 허용하시겠습니까?
            </p>
            <div className="w-full flex flex-col gap-3">
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    앱 사용 중에만 허용
                </button>
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    이번만 허용
                </button>
                <button
                    onClick={onPermissionDeny}
                    className="w-full py-4 bg-[#F0EEE9] rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform"
                >
                    허용 안 함
                </button>
            </div>
        </div>
    </div>
);
