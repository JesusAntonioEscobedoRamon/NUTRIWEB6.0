import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { syncPendingActions } from "@/utils/db";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true);
  const prevOnline = useRef(true);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;

    const handleOnline = () => {
      if (mounted.current && !prevOnline.current) {
        toast.success("Conexión restaurada", {
          duration: 4000,
          style: {
            background: "#2E8B57",
            color: "white",
            border: "none",
            fontWeight: "500",
          },
        });
        syncPendingActions();
      }
      setIsOnline(true);
      prevOnline.current = true;
    };

    const handleOffline = () => {
      if (mounted.current && prevOnline.current) {
        toast.error("Sin conexión a internet", {
          duration: 6000,
          style: {
            background: "#ef4444",
            color: "white",
            border: "none",
            fontWeight: "500",
          },
        });
      }
      setIsOnline(false);
      prevOnline.current = false;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const initial = navigator.onLine;
    setIsOnline(initial);
    prevOnline.current = initial;

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      mounted.current = false;
    };
  }, []);

  return { isOnline };
}
