// frontend\src\pages\Home\components\ProductSection.jsx
import { bestSellers, newProds } from "../data/products";

export default function ProductSection() {
  return (
    <>
        {/* BEST SELLERS */}
        <section className="rb-products">
          <div className="rb-sec-title">
            <h2>Sản Phẩm Bán Chạy</h2>
            <div className="rb-divider"><div className="gl"/><div className="gd"/><div className="gl"/></div>
          </div>
          <div className="rb-slider-wrap">
            <button className="rb-sbtn prev">&#8249;</button>
            <div className="row g-3">
              {bestSellers.map(p => (
                <div className="col-3" key={p.id}>
                  <div className="rb-pcard">
                    <div className="rb-pimg">
                      <img src={p.img} alt={p.name} />
                      <div className="rb-rank">{p.rank}</div>
                    </div>
                    <div className="rb-pinfo">
                      <div className="rb-pname">{p.name}</div>
                      <div className="rb-pbottom">
                        <span className="rb-price">{p.price}</span>
                        <span className="rb-sold">{p.sold}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="rb-sbtn next">&#8250;</button>
          </div>
        </section>

        {/* ═══ SẢN PHẨM MỚI ═══ */}
        <section className="rb-new-products">
          <div className="rb-sec-title">
            <h2>Sản Phẩm Mới</h2>
            <div className="rb-divider"><div className="gl"/><div className="gd"/><div className="gl"/></div>
          </div>
          <div className="row g-3">
            {newProds.map(p => (
              <div className="col-3" key={p.id}>
                <div className="rb-pcard">
                  <div className="rb-pimg">
                    <img src={p.img} alt={p.name} />
                    <div className="rb-newbadge">MỚI</div>
                  </div>
                  <div className="rb-pinfo">
                    <div className="rb-pname">{p.name}</div>
                    <div className="rb-pbottom"><span className="rb-price">{p.price}</span></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
    </>
  );
}