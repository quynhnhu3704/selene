export const orderService = {
  getOrders: async () => {
    // Hardcoded data as per requirements
    return [
      {
        id: 1,
        product: "Macbook Pro",
        price: 2500
      },
      {
        id: 2,
        product: "iPhone",
        price: 1200
      }
    ];
  }
};
