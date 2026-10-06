import { apiRequest } from "./client";

export const getCoupons = () => apiRequest("/coupons");
export const createCoupon = (data) =>
  apiRequest("/coupons", { method: "POST", body: JSON.stringify(data) });
export const updateCoupon = (id, data) =>
  apiRequest(`/coupons/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCoupon = (id) =>
  apiRequest(`/coupons/${id}`, { method: "DELETE" });