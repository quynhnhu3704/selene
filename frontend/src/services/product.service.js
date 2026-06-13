// frontend\src\services\product.service.js
export const getFeaturedProducts = () => {
  return Promise.resolve({
    data: [
      {
        _id: 1,
        product_name: "iPhone 15",
        price: 2000,
        image_url: "https://via.placeholder.com/150",
      },
      {
        _id: 2,
        product_name: "Samsung S24",
        price: 1800,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  });
};