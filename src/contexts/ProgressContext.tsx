import { createContext, useContext, useState, ReactNode } from "react";

interface ProgressContextType {
  progress: number;
  isProcessing: boolean;
  setProgress: (progress: number) => void;
  startProcessing: () => void;
  stopProcessing: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const startProcessing = () => {
    setIsProcessing(true);
    setProgress(0);
  };

  const stopProcessing = () => {
    setIsProcessing(false);
    setProgress(0);
  };

  return (
    <ProgressContext.Provider value={{ progress, isProcessing, setProgress, startProcessing, stopProcessing }}>
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
