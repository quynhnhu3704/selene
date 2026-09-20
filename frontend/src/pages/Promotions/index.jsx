// frontend\src\pages\Promotions\index.jsx
import Loading from "../../components/common/Loading";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "react-toastify";
import Breadcrumb from "../../components/layout/Breadcrumb";
import VoucherList from "../../components/common/VoucherList";
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
      <style>{`
        .promotions-page { padding: 32px 75px 72px; background: #fff; min-height: 70vh; }
        .promotions-title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 16px; }
        @media (max-width: 1520px) { .promotions-page { padding: 28px 24px 56px; } }
      `}</style>
      <Breadcrumb
        items={[{ label: "Trang chủ", path: "/" }, { label: "Khuyến mãi" }]}
      />
      <div className="promotions-page">
        <h1 className="promotions-title">Khuyến mãi</h1>
        <p className="text-muted">
          Các mã còn lượt sử dụng và phù hợp với giỏ hàng hiện tại của bạn.
        </p>
        {!loggedIn ? (
          <div className="text-center py-5">
            <p>Đăng nhập để xem các mã khuyến mãi dành cho bạn.</p>
            <Link
              to="/tai-khoan/dang-nhap"
              className="btn btn-dark rounded-pill px-4"
            >
              Đăng nhập
            </Link>
          </div>
        ) : loading ? (
          <div className="text-center py-5" role="status">
            <Loading text="Đang tải khuyến mãi..." />
          </div>
        ) : error ? (
          <div className="text-center py-5" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-outline-dark rounded-pill"
              onClick={loadVouchers}
            >
              Thử lại
            </button>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-ticket-perforated fs-1 text-secondary" />
            <p className="mt-3">
              Chưa có mã khuyến mãi phù hợp với giỏ hàng của bạn.
            </p>
            <Link to="/san-pham" className="btn btn-dark rounded-pill px-4">
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <>
            <div className="row g-4">
              {vouchers.map((voucher) => (
                <div
                  className="col-12 col-md-6 col-xl-4"
                  key={voucher.voucher_id}
                >
                  <VoucherList vouchers={[voucher]} onSelect={copyVoucher} />
                </div>
              ))}
            </div>
            <Link
              to="/gio-hang"
              className="btn btn-dark rounded-pill px-4 mt-4"
            >
              Đến giỏ hàng
            </Link>
          </>
        )}
      </div>
    </>
  );
}
