import Pagination, { usePagination } from "../../components/admin/Pagination.jsx";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/admin/AdminUI.jsx";
import { extraService } from "../../services/extraService.js";

// Review driver fee-waiver requests and internal wallet approvals, in one place.
export default function FeeReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [params] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [refunds, setRefunds] = useState([]);
  // The page shows pending, approved or rejected reviews from MongoDB.
  const visibleReviews = reviews.filter(review => filter === "all" || review.status === filter);
  const reviewPages = usePagination(visibleReviews);
  const walletPages = usePagination(requests);
  async function reload() {
    try {
      setReviews((await extraService.feeReviews()).reviews);
      setRequests((await extraService.walletRequests()).requests);
      setIncidents((await extraService.incidents()).incidents);
      setRefunds((await extraService.refunds()).refunds);
      setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { reload(); }, []);
  async function decideWaiver(id, status) {
    try { await extraService.decideFeeReview(id, status); await reload(); }
    catch (e) { setError(e.message); }
  }
  async function decideMoney(row, status) {
    if (status === "approved" && !window.confirm("Confirm you handled the real-world transfer outside GASFAR? This updates a DEMO ledger only.")) return;
    try { await extraService.decideWalletRequest(row.walletId, row.id, status); await reload(); }
    catch (e) { setError(e.message); }
  }
  async function resolveIssue(id) {
    if (!window.confirm("Mark this incident resolved? Confirm safe package handover separately.")) return;
    try { await extraService.resolveIncident(id); await reload(); }
    catch (e) { setError(e.message); }
  }
  async function confirmRefund(id) {
    if (!window.confirm("Has the cash refund REALLY been handled outside the system?")) return;
    try { await extraService.acknowledgeRefund(id); await reload(); }
    catch (e) { setError(e.message); }
  }
  return <section className="content"><PageHeader title="Fee Reviews & Wallet Requests" desc="Approve cancellation fee waivers, top-up records, and withdrawal records." />
    <p className="feature-notice">Wallet changes are bookkeeping records. GASFAR does not transfer real money or verify GCash payments automatically.</p>
    {error && <p role="alert" className="feature-error">{error}</p>}
    <div className="card tableCard"><div className="cardHead"><h2>Cancellation Fee Appeals</h2><span className="count">{reviews.filter(review => review.status === "pending").length} pending</span></div>
    <div className="feature-filters"><label>Show fee reviews <select value={filter} onChange={event => setFilter(event.target.value)}>
      <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option>
    </select></label></div>
    <div className="tableScroll"><table><thead><tr><th>Booking</th><th>Driver</th><th>Reason</th><th>Fee</th><th>Reviewed by / Decision</th></tr></thead><tbody>{reviewPages.pageRows.map(row => <tr key={row.id} className={params.get("focus") === row.id ? "feature-focus-row" : ""}><td>{row.id}</td><td>{row.driverName}</td><td>{row.reason} <a href={(import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/extra/admin/fee-reviews/" + encodeURIComponent(row.id) + "/proof"} target="_blank" rel="noreferrer">Open submitted proof</a></td><td>₱{(row.feeCentavos/100).toFixed(2)}</td><td className="feature-actions">{row.status === "pending" ? <>
    <button onClick={() => decideWaiver(row.id,"approved")}>Waive</button>
    <button onClick={() => decideWaiver(row.id,"rejected")}>Reject</button>
  </> : <span>{row.status} — {row.reviewerName || "Administrator"}</span>}</td></tr>)}</tbody></table></div><Pagination page={reviewPages.page} setPage={reviewPages.setPage} totalPages={reviewPages.totalPages}/></div>
    <div className="card tableCard"><div className="cardHead"><h2>Top-ups & Withdrawals</h2><span className="count">{requests.length} pending</span></div>
    <div className="tableScroll"><table><thead><tr><th>Driver</th><th>Kind</th><th>Amount</th><th>Account</th><th>Decision</th></tr></thead><tbody>{walletPages.pageRows.map(row => <tr key={row.id}><td>{row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "Driver"}</td><td>{row.kind}</td><td>₱{(row.amountCentavos/100).toFixed(2)}</td><td>{row.account || "—"}</td><td className="feature-actions"><button onClick={() => decideMoney(row,"approved")}>Approve record</button><button onClick={() => decideMoney(row,"rejected")}>Reject</button></td></tr>)}</tbody></table></div><Pagination page={walletPages.page} setPage={walletPages.setPage} totalPages={walletPages.totalPages}/></div>
    <div className="card tableCard"><div className="cardHead"><h2>Reported Delivery Issues</h2><span className="count">{incidents.length} open</span></div>
      <div className="tableScroll"><table><thead><tr><th>Booking</th><th>Customer</th><th>Reason</th><th>Action</th></tr></thead><tbody>
        {incidents.map(row => <tr key={row.id} className={params.get("focus") === row.id ? "feature-focus-row" : ""}><td>{row.id}</td><td>{row.customer}</td><td>{row.reason}</td><td><button onClick={() => resolveIssue(row.id)}>Mark resolved</button></td></tr>)}
      </tbody></table></div></div>
    <div className="card tableCard"><div className="cardHead"><h2>Cash Refund Follow-up</h2><span className="count">{refunds.length} awaiting confirmation</span></div>
      <p className="feature-mini">This list does not transfer cash. Admin must arrange and verify the refund manually.</p>
      <div className="tableScroll"><table><thead><tr><th>Booking</th><th>Customer</th><th>Amount</th><th>Action</th></tr></thead><tbody>
        {refunds.map(row => <tr key={row.id} className={params.get("focus") === row.id ? "feature-focus-row" : ""}><td>{row.id}</td><td>{row.customer}</td><td>₱{(row.amount/100).toFixed(2)}</td><td><button onClick={() => confirmRefund(row.id)}>Refund handled</button></td></tr>)}
      </tbody></table></div></div>
  </section>;
}
