import React, { useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { Check, CreditCard, ShieldCheck, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { AppHeader } from "../../layouts/ClientLayout.jsx";
import { SqCard, Field } from "../../components/client/booking/BookingUI.jsx";
import { DRIVER_WALLET, MOCK_DRIVER, MOCK_NOTIFICATIONS_DRIVER, MOCK_WALLET_TX } from "../../data/clientMockData.js";
import { peso } from "../../utils/helpers.js";

/* ═══ Driver Wallet ═══ */
const TopupModal = ({ onClose, onSubmit }) => {
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState("gcash");
  const quickAmounts = [100, 200, 500, 1000];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Top Up Wallet</h3><button className="modal-close" onClick={onClose}><FiX size={18} /></button></div>
        <div className="modal-body">
          <div className="modal-form">
            <Field label="Amount"><input type="number" className="field__input" value={amount} min="50" step="50" onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)} /></Field>
            <div className="topup-quick">{quickAmounts.map((a) => (<button key={a} className={`topup-quick__btn ${amount === a ? "active" : ""}`} onClick={() => setAmount(a)}>{peso(a)}</button>))}</div>
            <div className="input-group"><label className="input-label">Payment method</label><div className="bd-grid-3">{[{ id: "gcash", label: "GCash", Icon: CreditCard }, { id: "maya", label: "Maya", Icon: CreditCard }, { id: "bank", label: "Bank", Icon: CreditCard }].map((m) => (<SqCard key={m.id} selected={method === m.id} onClick={() => setMethod(m.id)} Icon={m.Icon} label={m.label} />))}</div></div>
            <div className="modal-notice"><ShieldCheck size={14} /><span>Funds reflect immediately. Commission is deducted per successful trip only.</span></div>
          </div>
        </div>
        <div className="modal-foot"><button className="modal-btn modal-btn--ghost" onClick={onClose}>Cancel</button><button className="modal-btn modal-btn--primary" disabled={amount < 50} onClick={() => onSubmit(amount, method.toUpperCase())}>Top Up {peso(amount)}</button></div>
      </div>
    </div>
  );
};
const DriverWalletPage = () => {
  const [txFilter, setTxFilter] = useState("all");
  const [showTopup, setShowTopup] = useState(false);
  const [balance, setBalance] = useState(DRIVER_WALLET.balance);
  const [txs, setTxs] = useState(MOCK_WALLET_TX);
  const filteredTx = txFilter === "all" ? txs : txs.filter((t) => t.type === txFilter);
  const handleTopup = (amount, method) => {
    const tx = { id: `t${Date.now()}`, type: "topup", amount, label: `Top-up via ${method}`, date: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) };
    setTxs([tx, ...txs]);
    setBalance((b) => b + amount);
    setShowTopup(false);
  };
  const low = balance < DRIVER_WALLET.minRequired;
  return (
    <div className="driver-shell">
      <AppHeader role="driver" user={{ name: MOCK_DRIVER.name }} notifications={MOCK_NOTIFICATIONS_DRIVER} online={MOCK_DRIVER.online} onToggleOnline={() => {}} walletBalance={balance} minBalance={DRIVER_WALLET.minRequired} profilePath="/driver/profile" showOnlineToggle={false} />
      <div className="driver-body">
        <div className="wallet-page">
          <div className="wallet-page__inner">
            <h1 className="order-history__title">Wallet</h1>
            <div className={`wallet-balance ${low ? "wallet-balance--low" : ""}`}>
              <div className="wallet-balance__label">Available Balance</div>
              <div className="wallet-balance__value">{peso(balance)}</div>
              <div className="wallet-balance__note"><Wallet size={13} />{low ? <>You need at least <strong>{peso(DRIVER_WALLET.minRequired)}</strong> to accept bookings. Top up now.</> : <>Minimum required to accept bookings: <strong>{peso(DRIVER_WALLET.minRequired)}</strong></>}</div>
              <button className="btn-wallet-topup" onClick={() => setShowTopup(true)}><FiPlus size={14} /> Top Up</button>
            </div>
            <div className="wallet-stats">
              <div className="wallet-stat"><span className="wallet-stat__icon wallet-stat__icon--in"><TrendingUp size={16} /></span><div><p className="wallet-stat__label">This week's commission</p><p className="wallet-stat__value">−{peso(50.5)}</p></div></div>
              <div className="wallet-stat"><span className="wallet-stat__icon wallet-stat__icon--out"><TrendingDown size={16} /></span><div><p className="wallet-stat__label">Total topped up</p><p className="wallet-stat__value">{peso(700)}</p></div></div>
            </div>
            <div className="wallet-tabs">{[{ id: "all", label: "All" }, { id: "commission", label: "Commission" }, { id: "topup", label: "Top-up" }, { id: "refund", label: "Refund" }].map((f) => (<button key={f.id} className={`wallet-tab ${txFilter === f.id ? "active" : ""}`} onClick={() => setTxFilter(f.id)}>{f.label}</button>))}</div>
            <div className="wallet-tx-list">
              {filteredTx.length === 0 ? (<div className="order-empty"><p>No transactions in this filter.</p></div>) : filteredTx.map((tx) => (
                <div key={tx.id} className="wallet-tx">
                  <div className={`wallet-tx__icon wallet-tx__icon--${tx.type}`}>{tx.type === "commission" && <TrendingDown size={14} />}{tx.type === "topup" && <TrendingUp size={14} />}{tx.type === "refund" && <Check size={14} />}</div>
                  <div className="wallet-tx__body"><p className="wallet-tx__label">{tx.label}</p><p className="wallet-tx__date">{tx.date}</p></div>
                  <span className={`wallet-tx__amount wallet-tx__amount--${tx.amount >= 0 ? "in" : "out"}`}>{tx.amount >= 0 ? "+" : "−"}{peso(Math.abs(tx.amount))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showTopup && <TopupModal onClose={() => setShowTopup(false)} onSubmit={handleTopup} />}
    </div>
  );
};


export default DriverWalletPage;
