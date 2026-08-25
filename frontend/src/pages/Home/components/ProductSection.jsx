// // frontend\src\pages\Home\components\ProductSection.jsx
// import { bestSellers, newProds } from "../data/products";

// export default function ProductSection() {
//   return (
//     <>
//       {/* BEST SELLERS */}
//       <section className="rb-products">
//         <div className="rb-sec-title">
//           <h2>Sản Phẩm Bán Chạy</h2>
//           <div className="rb-divider">
//             <div className="gl" />
//             <div className="gd" />
//             <div className="gl" />
//           </div>
//         </div>
//         <div className="rb-slider-wrap">
//           <button className="rb-sbtn prev">&#8249;</button>
//           <div className="row g-3">
//             {bestSellers.map((p) => (
//               <div className="col-3" key={p.id}>
//                 <div className="rb-pcard">
//                   <div className="rb-pimg">
//                     <img src={p.img} alt={p.name} />
//                     <div className="rb-rank">{p.rank}</div>
//                   </div>
//                   <div className="rb-pinfo">
//                     <div className="rb-pname">{p.name}</div>
//                     <div className="rb-pbottom">
//                       <span className="rb-price">{p.price}</span>
//                       <span className="rb-sold">{p.sold}</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//           <button className="rb-sbtn next">&#8250;</button>
//         </div>
//       </section>

//       {/* ═══ SẢN PHẨM MỚI ═══ */}
//       <section className="rb-new-products">
//         <div className="rb-sec-title">
//           <h2>Sản Phẩm Mới</h2>
//           <div className="rb-divider">
//             <div className="gl" />
//             <div className="gd" />
//             <div className="gl" />
//           </div>
//         </div>
//         <div className="row g-3">
//           {newProds.map((p) => (
//             <div className="col-3" key={p.id}>
//               <div className="rb-pcard">
//                 <div className="rb-pimg">
//                   <img src={p.img} alt={p.name} />
//                   <div className="rb-newbadge">MỚI</div>
//                 </div>
//                 <div className="rb-pinfo">
//                   <div className="rb-pname">{p.name}</div>
//                   <div className="rb-pbottom">
//                     <span className="rb-price">{p.price}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </section>
//     </>
//   );
// }

import { useRef } from "react";
import { Link } from "react-router-dom";

function fmt(n) {
  return Number(n || 0).toLocaleString("vi-VN") + "đ";
}

export default function ProductSection({
  title,
  products = [],
  type,
  loading = false,
}) {
  const sliderRef = useRef(null);

  const scroll = (direction) => {
    if (!sliderRef.current) return;

    sliderRef.current.scrollBy({
      left: direction === "next" ? 360 : -360,
      behavior: "smooth",
    });
  };

  return (
    <section className="pl-home-products">
      <div className="pl-home-title-row">
        <div className="pl-home-title">
          <h2>{title}</h2>

          <div className="rb-divider">
            <div className="gl" />
            <div className="gd" />
            <div className="gl" />
          </div>
        </div>

        {!loading && products.length > 4 && (
          <div className="pl-home-slider-buttons">
            <button
              type="button"
              onClick={() => scroll("prev")}
              aria-label="Xem sản phẩm trước"
            >
              &#8249;
            </button>

            <button
              type="button"
              onClick={() => scroll("next")}
              aria-label="Xem thêm sản phẩm"
            >
              &#8250;
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="pl-home-state">Đang tải sản phẩm...</div>
      ) : products.length === 0 ? (
        <div className="pl-home-state">Chưa có sản phẩm.</div>
      ) : (
        <div className="pl-home-slider" ref={sliderRef}>
          {products.map((product) => (
            <div className="pl-home-product-item" key={product.product_id}>
              <div className="pl-pcard">
                <div className="pl-pimg-wrap">
                  <Link to={"/san-pham/" + product.product_id}>
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      loading="lazy"
                    />
                  </Link>

                  {type === "new" && (
                    <span className="pl-home-new-badge">MỚI</span>
                  )}
                </div>

                <div className="pl-pinfo">
                  <Link
                    className="pl-pname"
                    to={"/san-pham/" + product.product_id}
                  >
                    {product.product_name}
                  </Link>

                  <div className="pl-price-row">
                    <span className="pl-price-current">
                      {fmt(product.discount_price)}
                    </span>

                    {Number(product.original_price) >
                      Number(product.discount_price) && (
                      <span className="pl-price-original">
                        {fmt(product.original_price)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rb-view-all">
        <Link to="/san-pham">Xem tất cả sản phẩm</Link>
      </div>
    </section>
  );
}
