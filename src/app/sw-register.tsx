"use client";

import { useEffect } from "react";

/** Daftarkan service worker (hanya di production, bukan localhost). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      "serviceWorker" in navigator &&
      location.hostname !== "localhost" &&
      location.hostname !== "127.0.0.1"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
