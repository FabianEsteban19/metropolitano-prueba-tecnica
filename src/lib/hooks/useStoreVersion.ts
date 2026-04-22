import { useEffect, useState } from "react";
import { onStoreChange } from "@/lib/api/metropolitanoApi";

/** Hook utilitario que fuerza re-render cuando cambian los datos del store. */
export function useStoreVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    const off = onStoreChange(() => setV((x) => x + 1));
    const onWin = () => setV((x) => x + 1);
    window.addEventListener("metropolitano:store-updated", onWin);
    return () => { off(); window.removeEventListener("metropolitano:store-updated", onWin); };
  }, []);
  return v;
}
