import React from "react";
import { Mic, Camera, MapPin } from "lucide-react";

export interface PermissionPageProps {
    onPermissionGrant: () => void;
    onPermissionDeny: () => void;
}

export const MicPermissionPage: React.FC<PermissionPageProps> = ({ onPermissionGrant, onPermissionDeny }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 quote-font">
        <div className="bg-white/90 backdrop-blur-md w-full max-w-xs rounded-[2rem] p-8 pb-6 flex flex-col items-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 animate-slide-up">
            <h2 className="text-center font-bold mb-8 text-[#1A1A1A] text-[20px] leading-[1.3] break-keep">
                AIRA에서 오디오를 녹음하도록<br />허용하시겠습니까?
            </h2>
            <div className="w-full flex flex-col gap-2.5">
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    앱 사용 중에만 허용
                </button>
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    이번만 허용
                </button>
                <button
                    onClick={onPermissionDeny}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    허용 안 함
                </button>
            </div>
        </div>
    </div>
);

export const CameraPermissionPage: React.FC<PermissionPageProps> = ({ onPermissionGrant, onPermissionDeny }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 quote-font">
        <div className="bg-white/90 backdrop-blur-md w-full max-w-xs rounded-[2rem] p-8 pb-6 flex flex-col items-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 animate-slide-up">
            <h2 className="text-center font-bold mb-8 text-[#1A1A1A] text-[20px] leading-[1.3] break-keep">
                AIRA에서 사진과 동영상을<br />촬영하도록 허용하시겠습니까?
            </h2>
            <div className="w-full flex flex-col gap-2.5">
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    앱 사용 중에만 허용
                </button>
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    이번만 허용
                </button>
                <button
                    onClick={onPermissionDeny}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    허용 안 함
                </button>
            </div>
        </div>
    </div>
);

export const LocationPermissionPage: React.FC<PermissionPageProps> = ({ onPermissionGrant, onPermissionDeny }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 quote-font">
        <div className="bg-white/90 backdrop-blur-md w-full max-w-xs rounded-[2rem] p-8 pb-6 flex flex-col items-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 animate-slide-up">
            <h2 className="text-center font-bold mb-8 text-[#1A1A1A] text-[20px] leading-[1.3] break-keep">
                AIRA에서 기기의 위치에<br />액세스하도록 허용하시겠습니까?
            </h2>
            <div className="w-full flex flex-col gap-2.5">
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    앱 사용 중에만 허용
                </button>
                <button
                    onClick={onPermissionGrant}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    이번만 허용
                </button>
                <button
                    onClick={onPermissionDeny}
                    className="w-full py-3.5 bg-[#F4F4F4] hover:bg-[#EBEBEB] rounded-xl font-semibold text-[15px] text-[#333333] active:scale-[0.98] transition-all"
                >
                    허용 안 함
                </button>
            </div>
        </div>
    </div>
);
