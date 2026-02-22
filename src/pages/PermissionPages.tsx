import React, { useEffect, useRef, useState } from "react";

export interface PermissionPageProps {
  onPermissionGrant: () => void | Promise<void>;
  onPermissionDeny: () => void | Promise<void>;
}

interface PermissionDialogProps extends PermissionPageProps {
  title: React.ReactNode;
}

const baseButtonClass =
  "w-full min-h-[52px] rounded-xl font-semibold text-[15px] select-none touch-manipulation transition-all " +
  "active:scale-[0.99] active:bg-[#E4E4E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400";

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  title,
  onPermissionGrant,
  onPermissionDeny,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runAction = async (action: () => void | Promise<void>) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await action();
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6 quote-font touch-manipulation">
      <div className="bg-white/90 backdrop-blur-md w-full max-w-sm rounded-[2rem] p-8 pb-6 flex flex-col items-center shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/50 animate-slide-up">
        <h2 className="text-center font-bold mb-8 text-[#1A1A1A] text-[20px] leading-[1.3] break-keep">{title}</h2>

        <div className="w-full flex flex-col gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction(onPermissionGrant)}
            className={`${baseButtonClass} ${isSubmitting ? "bg-[#EAEAEA] text-[#9A9A9A] cursor-not-allowed" : "bg-[#F4F4F4] hover:bg-[#EBEBEB] text-[#333333] cursor-pointer"}`}
          >
            앱 사용 중에만 허용
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction(onPermissionGrant)}
            className={`${baseButtonClass} ${isSubmitting ? "bg-[#EAEAEA] text-[#9A9A9A] cursor-not-allowed" : "bg-[#F4F4F4] hover:bg-[#EBEBEB] text-[#333333] cursor-pointer"}`}
          >
            이번만 허용
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => runAction(onPermissionDeny)}
            className={`${baseButtonClass} ${isSubmitting ? "bg-[#EAEAEA] text-[#9A9A9A] cursor-not-allowed" : "bg-[#F4F4F4] hover:bg-[#EBEBEB] text-[#333333] cursor-pointer"}`}
          >
            허용 안 함
          </button>
        </div>
      </div>
    </div>
  );
};

export const MicPermissionPage: React.FC<PermissionPageProps> = (props) => (
  <PermissionDialog
    {...props}
    title={
      <>
        AIRA에서 마이크를 사용하도록
        <br />
        허용하시겠습니까?
      </>
    }
  />
);

export const CameraPermissionPage: React.FC<PermissionPageProps> = (props) => (
  <PermissionDialog
    {...props}
    title={
      <>
        AIRA에서 사진과 동영상을
        <br />
        촬영하도록 허용하시겠습니까?
      </>
    }
  />
);

export const LocationPermissionPage: React.FC<PermissionPageProps> = (props) => (
  <PermissionDialog
    {...props}
    title={
      <>
        AIRA에서 기기의 위치에
        <br />
        액세스하도록 허용하시겠습니까?
      </>
    }
  />
);
