import { apiRequest } from "./client";

export const getCart = () => apiRequest("/cart");
export const addToCart = (product_id, quantity = 1) =>
  apiRequest("/cart", {
    method: "POST",
    body: JSON.stringify({ product_id, quantity }),
  });
export const updateCartItem = (id, quantity) =>
  apiRequest(`/cart/${id}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
export const removeCartItem = (id) =>
  apiRequest(`/cart/${id}`, { method: "DELETE" });