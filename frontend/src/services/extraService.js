/*
 * extraService.js — Small frontend functions that call the Express routes.
 * NO MongoDB code belongs here. This file is like the React API calls in
 * the ThinkBoard tutorial. "apiRequest" uses fetch() and sends the login cookie.
 *
 * Example: extraService.wallet() -> GET /api/extra/wallet
 *          -> extraRoutes.js -> getMyWallet() -> Wallet.findOne() -> MongoDB.
 */
import { apiRequest } from "./api.js";

export const extraService = {
  // ADMIN: these records come from the users, bookings, profiles and wallet collections.
  moderators() { return apiRequest("/extra/admin/moderators"); },
  createModerator(details) { return apiRequest("/extra/admin/moderators", { method: "POST", body: JSON.stringify(details) }); },
  setModeratorStatus(id, status) { return apiRequest("/extra/admin/moderators/" + id, { method: "PATCH", body: JSON.stringify({ status }) }); },
  adminAttention() { return apiRequest("/extra/admin/attention"); },
  markAttentionRead(id) { return apiRequest("/extra/admin/attention/read", { method: "POST", body: JSON.stringify({ id }) }); },

  // CUSTOMER / DRIVER PROFILE
  saveProfile(details) {
    return apiRequest("/extra/me/profile", { method: "PATCH", body: JSON.stringify(details) });
  },
  changePassword(oldPassword, newPassword) {
    const details = { oldPassword: oldPassword, newPassword: newPassword };
    return apiRequest("/extra/me/password", { method: "POST", body: JSON.stringify(details) });
  },
  deactivateAccount(password) {
    return apiRequest("/extra/me/deactivate", { method: "POST", body: JSON.stringify({ password: password }) });
  },
  removeProfilePhoto() { return apiRequest("/extra/me/photo", { method: "DELETE" }); },
  updateProfilePhoto(file) {
    const form = new FormData();
    form.append("photo", file);
    return apiRequest("/extra/me/photo", { method: "POST", body: form });
  },
  addresses() { return apiRequest("/extra/me/addresses"); },
  addAddress(address) {
    return apiRequest("/extra/me/addresses", { method: "POST", body: JSON.stringify(address) });
  },
  editAddress(id, address) {
    return apiRequest("/extra/me/addresses/" + id, { method: "PATCH", body: JSON.stringify(address) });
  },
  removeAddress(id) {
    return apiRequest("/extra/me/addresses/" + id, { method: "DELETE" });
  },

  // CUSTOMER CREDIT (these records are not cash balances)
  myCredit() { return apiRequest("/extra/me/credit"); },

  // DRIVER WALLET — Requests are records until an admin approves them.
  wallet() { return apiRequest("/extra/wallet"); },
  walletRequest(kind, amount, account) {
    const details = { kind: kind, amount: amount, account: account };
    return apiRequest("/extra/wallet/request", { method: "POST", body: JSON.stringify(details) });
  },

  // DRIVER VERIFICATION
  driverProfile() { return apiRequest("/extra/driver/profile"); },
  submitRenewal(formData) {
    return apiRequest("/extra/driver/renewal", { method: "POST", body: formData });
  },

  // ADMIN CUSTOMER / DRIVER APPROVAL
  adminUsers() { return apiRequest("/extra/admin/users"); },
  updateAccount(id, status) {
    return apiRequest("/extra/admin/users/" + id + "/status", {
      method: "PATCH", body: JSON.stringify({ status: status }),
    });
  },
  adminDrivers() { return apiRequest("/extra/admin/drivers"); },
  decideRenewal(id, status) {
    return apiRequest("/extra/admin/drivers/" + id + "/renewal", {
      method: "PATCH", body: JSON.stringify({ status: status }),
    });
  },

  // ADMIN DRIVER CANCELLATION FEE REVIEWS
  feeReviews() { return apiRequest("/extra/admin/fee-reviews"); },
  decideFeeReview(id, status) {
    return apiRequest("/extra/admin/fee-reviews/" + encodeURIComponent(id), {
      method: "PATCH", body: JSON.stringify({ status: status }),
    });
  },

  // ADMIN WALLET REQUESTS
  walletRequests() { return apiRequest("/extra/admin/wallet-requests"); },
  decideWalletRequest(walletId, id, status) {
    return apiRequest("/extra/admin/wallet-requests/" + walletId + "/" + id, {
      method: "PATCH", body: JSON.stringify({ status: status }),
    });
  },

  // ADMIN DASHBOARD
  deliveries() { return apiRequest("/extra/admin/deliveries"); },
  stats() { return apiRequest("/extra/admin/stats"); },
  confirmPayment(id) {
    return apiRequest("/extra/admin/bookings/" + encodeURIComponent(id) + "/confirm-payment", {
      method: "PATCH",
    });
  },

  // ADMIN DELIVERY INCIDENTS AND CASH REFUNDS
  incidents() { return apiRequest("/extra/admin/incidents"); },
  resolveIncident(id) {
    return apiRequest("/extra/admin/incidents/" + encodeURIComponent(id), { method: "PATCH" });
  },
  refunds() { return apiRequest("/extra/admin/cash-refunds"); },
  acknowledgeRefund(id) {
    return apiRequest("/extra/admin/cash-refunds/" + encodeURIComponent(id), { method: "PATCH" });
  },
};
