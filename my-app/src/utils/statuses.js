export const STATUS_LABELS = {
  pending_payment: "Ожидает оплаты",
  paid: "Оплачен",
  cancelled: "Отменён",
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export const STATUS_COLORS = {
  pending_payment: "#b8860b",
  paid: "#2e7d32",
  cancelled: "#c62828",
};

export function getStatusColor(status) {
  return STATUS_COLORS[status] || "#555";
}