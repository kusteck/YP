import { apiRequest } from "./client";

export const getUsers = (search = "") =>
  apiRequest(`/users${search ? `?search=${search}` : ""}`);
export const setUserCoupon = (id, coupon_id) =>
  apiRequest(`/users/${id}/coupon`, {
    method: "PUT",
    body: JSON.stringify({ coupon_id }),
  });