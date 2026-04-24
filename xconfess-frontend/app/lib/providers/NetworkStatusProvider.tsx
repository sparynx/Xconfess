"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface NetworkStatusContextType {
  isOnline: boolean;
  isDegraded: boolean;
  setDegraded: (degraded: boolean) => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export const NetworkStatusProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [isDegraded, setIsDegraded] = useState(false);

  const setDegradedValue = useCallback((degraded: boolean) => {
    setIsDegraded(degraded);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network Information API for degradation detection
    const nav = navigator as any;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    const updateConnectionStatus = () => {
      if (connection) {
        // Degraded if effectiveType is 2g or slow-2g, or if rtt is high
        const degraded = 
          connection.effectiveType === "2g" || 
          connection.effectiveType === "slow-2g" ||
          (connection.rtt && connection.rtt > 500);
        
        setIsDegraded(degraded);
      }
    };

    if (connection) {
      connection.addEventListener("change", updateConnectionStatus);
      updateConnectionStatus();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateConnectionStatus);
      }
    };
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline, isDegraded, setDegraded: setDegradedValue }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error("useNetwork must be used within a NetworkStatusProvider");
  }
  return context;
};
