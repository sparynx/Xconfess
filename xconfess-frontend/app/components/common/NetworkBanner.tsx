import React, { useState, useEffect } from "react";
import { useNetwork } from "@/app/lib/providers/NetworkStatusProvider";
import { WifiOff, AlertTriangle, RefreshCcw, X } from "lucide-react";

export const NetworkBanner = () => {
  const { isOnline, isDegraded } = useNetwork();
  const [isVisible, setIsVisible] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastStatus, setLastStatus] = useState({ isOnline, isDegraded });

  useEffect(() => {
    // Show banner if offline or degraded
    if (!isOnline || isDegraded) {
      setIsVisible(true);
      setLastStatus({ isOnline, isDegraded });
    } else {
      // Small delay before hiding to avoid flickering on quick reconnections
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isDegraded]);

  const handleRetry = () => {
    setIsRetrying(true);
    // Trigger a window refresh or a re-fetch of critical data
    // For now, we simulate a retry by checking navigation status
    setTimeout(() => {
      setIsRetrying(false);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }, 1500);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md transition-all duration-500 ease-out transform ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-10 opacity-0"
      }`}
    >
      <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${
        !lastStatus.isOnline 
          ? "bg-red-500/10 border-red-500/20 text-red-200" 
          : "bg-amber-500/10 border-amber-500/20 text-amber-200"
      }`}>
        {/* Animated background gradient */}
        <div className={`absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer`} />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className={`flex-shrink-0 rounded-xl p-2 ${
            !lastStatus.isOnline ? "bg-red-500/20" : "bg-amber-500/20"
          }`}>
            {!lastStatus.isOnline ? (
              <WifiOff className="w-5 h-5 text-red-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
          </div>
          
          <div className="flex-grow pt-0.5">
            <h3 className="font-semibold text-sm">
              {!lastStatus.isOnline ? "You're offline" : "Poor network connection"}
            </h3>
            <p className="text-xs opacity-70 mt-0.5 leading-relaxed">
              {!lastStatus.isOnline 
                ? "Check your internet connection and try again." 
                : "Your connection is unstable. Some features may be limited."}
            </p>
            
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !lastStatus.isOnline
                    ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                    : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
                } disabled:opacity-50`}
              >
                <RefreshCcw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying ? "Retrying..." : "Retry Connection"}
              </button>
              
              <button
                onClick={() => setIsVisible(false)}
                className="text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
