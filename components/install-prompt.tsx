"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if device is iOS
    const isIosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check if already installed
    const isAppStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
    setIsStandalone(isAppStandalone);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone) {
    return null; // Don't show if already installed
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t z-50 text-sm text-center shadow-lg">
        To install this app on your iPhone, tap the <strong>Share</strong> button and then <strong>Add to Home Screen</strong>.
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={handleInstallClick} className="shadow-lg">
          Install App
        </Button>
      </div>
    );
  }

  return null;
}
