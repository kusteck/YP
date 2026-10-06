import { apiRequest } from "./client";

export const createOrder = (items, total, address) =>
  apiRequest("/orders", {
    method: "POST",
    body: JSON.stringify({ items, total, address }),
  });

export const getMyOrders = () => apiRequest("/orders/my");