// frontend\src\pages\Home\hooks\useHomeData.js
import { useEffect, useState } from "react";
import { getFeaturedProducts } from "../../../services/product.service";

export default function useHomeData() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeaturedProducts()
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, []);

  return { products, loading };
}