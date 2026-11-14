export const formatPhone = (phone) =>
  String(phone || "").replace(/^(\d{4})(\d{3})(\d{3})$/, "$1.$2.$3") || "—";
