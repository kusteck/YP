import { apiRequest } from "./client";

export const getReviews = (productId) => apiRequest(`/reviews/${productId}`);
export const createReview = (data) =>
  apiRequest("/reviews", { method: "POST", body: JSON.stringify(data) });
export const deleteReview = (id) => apiRequest(`/reviews/${id}`, { method: "DELETE" });