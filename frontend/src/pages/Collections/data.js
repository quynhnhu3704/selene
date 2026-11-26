export function collectionLink(colors) {
  return `/san-pham?${new URLSearchParams({ colors: colors.join(",") })}`;
}

export const collections = [
  {
    id: "tiec-cuoi-nam",
    title: "Tiệc Cuối Năm",
    description: "Lộng lẫy và cuốn hút trong từng khoảnh khắc",
    colors: ["Đỏ", "Đen"],
    image: "party",
  },
  {
    id: "da-tiec-thanh-lich",
    title: "Dạ Tiệc Thanh Lịch",
    description: "Tinh tế, sang trọng và đầy nữ tính",
    colors: ["Trắng", "Hồng"],
    image: "evening",
  },
  {
    id: "du-lich-mua-he",
    title: "Du Lịch Mùa Hè",
    description: "Thoải mái, năng động và tràn đầy sức sống",
    colors: ["Xanh", "Trắng"],
    image: "summer",
  },
  {
    id: "thu-dong-2025",
    title: "Thu Đông 2025",
    description: "Ấm áp, thời thượng và dễ ứng dụng",
    colors: ["Nâu", "Đen", "Xám"],
    image: "autumn",
  },
];

export const slides = [
  {
    title: "Xuân Hè 2026",
    description: "Thanh lịch, nhẹ nhàng và đầy cảm hứng cho mùa mới.",
    colors: ["Trắng", "Hồng", "Xanh"],
    signature: ["Spring", "Summer"],
  },
  {
    title: "Dạ Tiệc Thanh Lịch",
    description: "Tinh tế, sang trọng và đầy nữ tính trong từng khoảnh khắc.",
    colors: ["Trắng", "Hồng"],
    signature: ["Elegant", "Evening"],
  },
  {
    title: "Thu Đông 2025",
    description: "Ấm áp, thời thượng và dễ ứng dụng mỗi ngày.",
    colors: ["Nâu", "Đen", "Xám"],
    signature: ["Autumn", "Winter"],
  },
];
