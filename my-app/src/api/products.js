import { apiRequest } from "./client";

export const getProducts = (params = "") => apiRequest(`/products${params}`);
export const getProduct = (id) => apiRequest(`/products/${id}`);
export const createProduct = (data) =>
  apiRequest("/products", { method: "POST", body: JSON.stringify(data) });
export const updateProduct = (id, data) =>
  apiRequest(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProduct = (id) =>
  apiRequest(`/products/${id}`, { method: "DELETE" });