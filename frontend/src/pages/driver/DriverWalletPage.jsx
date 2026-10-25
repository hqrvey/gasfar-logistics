import { useEffect, useState } from "react";
import { CreditCard, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import AppHeader from "../../components/common/AppHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { extraService } from "../../services/extraService.js";

// A real MongoDB-backed INTERNAL ledger replaces the old MOCK_WALLET_TX array.
// Top-ups and withdrawals are REQUESTS for admin review, not real transfers.
export default function DriverWalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [kind, setKind] = useState("topup");
  const [amount, setAmount] = useState("500");
  const [account, setAccount] = useState("");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function load() {
    try { setWallet((await extraService.wallet()).wallet); setError(""); }
    catch (problem) { setError(problem.message); }
  }
  useEffect(() => { load(); }, []);
  async function request() {
    try {
      const result = await extraService.walletRequest(kind, Number(amount), account);
      setMessage(result.message);
      await load();
    } catch (problem) { setError(problem.message); }
  }
  const balance = wallet ? wallet.balanceCentavos / 100 : 0;
  const transactions = wallet ? [...wallet.transactions].reverse().filter(tx => filter === "all" || tx.kind === filter) : [];
  const peso = (number) => "₱" + Number(number).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="driver-shell">
    <AppHeader role="driver" user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}` }} walletBalance={balance} minBalance={50} profilePath="/driver/profile" showOnlineToggle={false} />
    <div className="driver-body"><div className="wallet-page"><div className="wallet-page__inner">
      <h1 className="order-history__title">Driver Wallet</h1>
      {error && <p role="alert" className="feature-error">{error}</p>}
      {message && <p role="status" className="feature-notice">{message}</p>}
      <div className={`wallet-balance ${balance < 50 ? "wallet-balance--low" : ""}`}>
        <div className="wallet-balance__label">Recorded wallet balance</div>
        <div className="wallet-balance__value">{peso(balance)}</div>
        <div className="wallet-balance__note"><Wallet size={14}/> Cash jobs require enough recorded balance to cover the 15% fee.</div>
      </div>
      <div className="feature-panel">
        <h2>Request top-up or withdrawal</h2>
        <p className="feature-notice"><CreditCard size={14}/> This app does not charge GCash or send payouts. Administrators must verify transfers separately before approving these records.</p>
        <div className="feature-filters">
          <label>Action <select value={kind} onChange={e => setKind(e.target.value)}><option value="topup">Top up</option><option value="withdrawal">Withdraw</option></select></label>
          <label>Amount (₱) <input type="number" min="50" step="50" value={amount} onChange={e => setAmount(e.target.value)}/></label>
          <label>Payment reference / payout account <input value={account} onChange={e => setAccount(e.target.value)} placeholder="Reference or account" /></label>
          <button className="btn-wallet-topup" onClick={request}>Submit request</button>
        </div>
      </div>
      <div className="feature-panel"><h2>Pending requests</h2>
        {wallet?.requests?.filter(item => item.status === "pending").map(item => <p key={item._id}>{item.kind} {peso(item.amountCentavos / 100)} — {item.status}</p>)}
        {!wallet?.requests?.some(item => item.status === "pending") && <p>No pending requests.</p>}
      </div>
      <div className="wallet-tabs">{["all", "topup", "withdrawal", "commission", "earnings", "cancellation", "refund"].map(name => <button key={name} className={`wallet-tab ${filter === name ? "active" : ""}`} onClick={() => setFilter(name)}>{name}</button>)}</div>
      <div className="wallet-tx-list">{transactions.length === 0 ? <div className="order-empty"><p>No transactions in this category.</p></div> : transactions.map((tx,i) => <div className="wallet-tx" key={tx._id || i}>
        <div className="wallet-tx__icon">{tx.amountCentavos >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}</div>
        <div className="wallet-tx__body"><p className="wallet-tx__label">{tx.label || tx.kind}</p><p className="wallet-tx__date">{new Date(tx.date).toLocaleString("en-PH")}</p></div>
        <span className="wallet-tx__amount">{tx.amountCentavos >= 0 ? "+" : "−"}{peso(Math.abs(tx.amountCentavos)/100)}</span>
      </div>)}</div>
    </div></div></div>
  </div>;
}
