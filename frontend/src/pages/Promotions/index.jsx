import EmptyState from "../../components/common/EmptyState";
// frontend\src\pages\Promotions\index.jsx
import Loading from "../../components/common/Loading";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Breadcrumb from "../../components/layout/Breadcrumb";
import PromotionCard from "./PromotionCard";
import styles from "./promotions.module.css";
import { getCustomerVouchers } from "../../services/voucher.service";
import { isLoggedIn } from "../../utils/auth";

export default function Promotions() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    getCustomerVouchers()
      .then((response) => {
        if (active) setVouchers(response.data || []);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.message ||
              "Không thể tải khuyến mãi. Vui lòng thử lại.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loggedIn, retry]);

  const loadVouchers = () => {
    setLoading(true);
    setError("");
    setRetry((value) => value + 1);
  };

  const copyVoucher = async (voucher) => {
    try {
      await navigator.clipboard.writeText(voucher.code);
      toast.success("Đã sao chép mã. Bạn có thể sử dụng khi thanh toán.");
    } catch {
      toast.info(`Mã khuyến mãi: ${voucher.code}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Khuyến mãi | Selene</title>
      </Helmet>
      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Khuyến mãi" }]}
      />
      <div className={`promotions-page ${styles.page}`}>
        <h1 className="adm-page-title promotions-title">Khuyến mãi</h1>
        {!loggedIn ? (
          <div className="text-center py-5">
            <p>Đăng nhập để xem các mã khuyến mãi dành cho bạn.</p>
            <Link
              to="/tai-khoan/dang-nhap"
              className="form-btn btn btn-dark fw-semibold px-4 mb-0"
            >
              Đăng nhập
            </Link>
          </div>
        ) : loading ? (
          <div className={styles.loading} role="status" aria-live="polite">
            <Loading text="Đang tải khuyến mãi..." />
          </div>
        ) : error ? (
          <div className="text-center py-5" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="form-btn btn btn-outline-dark fw-semibold px-4 mb-0"
              onClick={loadVouchers}
            >
              Thử lại
            </button>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-5">
            <EmptyState text="Không có mã khuyến mãi nào để hiển thị" />
            <Link to="/san-pham" className="form-btn btn btn-dark fw-semibold px-4 mb-0">
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {vouchers.map((voucher, index) => (
                <div
                  key={voucher.voucher_id || voucher.id || voucher.code}
                >
                  <PromotionCard voucher={voucher} variant={index % 3} onCopy={copyVoucher} />
                </div>
              ))}
            </div>
            <div className="d-flex justify-content-end mt-4">
              <Link
                to="/gio-hang"
                className="d-inline-flex align-items-center gap-2 form-link-sm"
                style={{ fontSize: 15 }}
              >
                Đến giỏ hàng
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
