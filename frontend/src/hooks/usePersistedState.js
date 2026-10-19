import { useEffect, useState } from "react";
import { getSaved, putSaved } from "../utils/storage.js";

// useState that reads its initial value from localStorage and saves every change.
export default function usePersistedState(key, fallback) {
  const [value, setValue] = useState(() => getSaved(key, fallback));

  useEffect(() => {
    putSaved(key, value);
  }, [key, value]);

  return [value, setValue];
}
