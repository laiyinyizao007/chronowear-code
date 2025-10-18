import { createContext, useContext, useState, useRef, ReactNode } from "react";

interface ProgressContextType {
  progress: number;
  isProcessing: boolean;
  setProgress: (progress: number) => void;
  startProcessing: () => void;
  stopProcessing: () => void;
  startFakeProgress: (duration?: number) => void;
  doneProgress: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

// 反正切函数计算假进度
const calculateFakeProgress = (elapsed: number, duration: number): number => {
  // 使用反正切函数：y = 100 * (2/π) * arctan(4x/T)
  // 其中 x = elapsed, T = duration
  const x = elapsed / duration;
  const progress = 100 * (2 / Math.PI) * Math.atan(4 * x);
  return Math.min(progress, 99.5); // 最大到 99.5%
};

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(1000);

  const startProcessing = () => {
    setIsProcessing(true);
    setProgress(0);
  };

  const stopProcessing = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsProcessing(false);
    setProgress(0);
  };

  const startFakeProgress = (duration: number = 1000) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    startTimeRef.current = Date.now();
    durationRef.current = duration;
    setIsProcessing(true);

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const currentProgress = calculateFakeProgress(elapsed, durationRef.current);

      if (currentProgress >= 99.5) {
        setProgress(99.5);
        return;
      }

      setProgress(currentProgress);

      if (currentProgress < 99.5) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const doneProgress = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // 瞬间跳到 100%
    setProgress(100);

    // 延迟后重置
    setTimeout(() => {
      setProgress(0);
      setIsProcessing(false);
    }, 400);
  };

  return (
    <ProgressContext.Provider 
      value={{ 
        progress, 
        isProcessing, 
        setProgress, 
        startProcessing, 
        stopProcessing,
        startFakeProgress,
        doneProgress
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error("useProgress must be used within a ProgressProvider");
  }
  return context;
}
