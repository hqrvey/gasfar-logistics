import { useEffect, useState } from "react";
import { extraService } from "../services/extraService.js";

// The driver header displays the MongoDB wallet balance, not demo wallet data.
// `wallet.balanceCentavos / 100` converts saved centavos into Philippine pesos.
export default function useDriverWallet() {
  const [balance, setBalance] = useState(0);
  useEffect(() => {
    let active = true;
    extraService.wallet().then(result => {
      if (active) setBalance((result.wallet?.balanceCentavos || 0) / 100);
    }).catch(error => console.warn("Wallet:", error.message));
    return () => { active = false; };
  }, []);
  return balance;
}
