"use client";

import * as React from "react";

export function PwaRegister() {
  React.useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("KostKita PWA Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("KostKita PWA Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}

