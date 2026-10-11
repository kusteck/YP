import { apiRequest } from "./client";

export const createOrder = (address, delivery_date) =>
  apiRequest("/orders", { method: "POST", body: JSON.stringify({ address, delivery_date }) });

export const getMyOrders = () => apiRequest("/orders/my");
export const getAllOrders = () => apiRequest("/orders");
export const updateOrderStatus = (id, status) =>
  apiRequest(`/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
export const deleteOrder = (id) => apiRequest(`/orders/${id}`, { method: "DELETE" });