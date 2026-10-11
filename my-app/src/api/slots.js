import { apiRequest } from "./client";

export const getDeliverySlots = () => apiRequest("/delivery-slots");