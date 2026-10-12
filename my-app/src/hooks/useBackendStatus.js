import { useState, useEffect, useCallback } from "react";

export function useBackendStatus() {
  const [available, setAvailable] = useState(null);
  const [checking, setChecking] = useState(true);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("http://localhost:3001/api/test");
      if (!res.ok) throw new Error("not ok");
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { available, checking, recheck: check };
}