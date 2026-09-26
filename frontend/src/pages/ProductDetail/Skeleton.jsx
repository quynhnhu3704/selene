import Breadcrumb from "../../components/layout/Breadcrumb";
import "./skeleton.css";

export default function ProductDetailSkeleton() {
  return (
    <div
      className="pd-skeleton"
      role="status"
      aria-label="Đang tải chi tiết sản phẩm"
      aria-busy="true"
    >
      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Sản phẩm", path: "/san-pham" },
        ]}
      />
      <div className="pd-skeleton-layout" aria-hidden="true">
        <div className="pd-skeleton-gallery">
          <div className="pd-skeleton-thumbs">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pd-placeholder" />
            ))}
          </div>
          <div className="pd-placeholder pd-skeleton-image" />
        </div>
        <div className="pd-skeleton-info">
          <div className="pd-placeholder pd-skeleton-price" />
          <div className="pd-placeholder pd-skeleton-title" />
          <div className="pd-placeholder pd-skeleton-sku" />
          <div className="pd-skeleton-options">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pd-placeholder" />
            ))}
          </div>
          <div className="pd-skeleton-options">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="pd-placeholder" />
            ))}
          </div>
          <div className="pd-placeholder pd-skeleton-action" />
          <div className="pd-placeholder pd-skeleton-commits" />
        </div>
      </div>
    </div>
  );
}
