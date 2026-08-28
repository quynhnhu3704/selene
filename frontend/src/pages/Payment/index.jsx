// frontend\src\pages\Payment\index.jsx
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";
import { getOrderById } from "../../services/order.service";

const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

const getStoredPayment = (orderId) => {
  if (!orderId) return null;

  try {
    const value = sessionStorage.getItem(`selene:payment:${orderId}`);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");

  const [payment, setPayment] = useState(
    () => location.state || getStoredPayment(orderIdFromUrl),
  );
  const [paymentLoading, setPaymentLoading] = useState(() =>
    Boolean(
      orderIdFromUrl && !location.state && !getStoredPayment(orderIdFromUrl),
    ),
  );

  const [copied, setCopied] = useState(null);
  const [paid, setPaid] = useState(false);

  const isSePay = payment?.paymentMethod === "sepay";
  const bank = payment?.bank || {};
  const paymentInformation = [
    {
      label: "Ngân hàng",
      value: bank.name || bank.code,
      copyValue: bank.name || bank.code,
      key: "bank",
    },
    {
      label: "Số tài khoản",
      value: bank.account_number,
      copyValue: bank.account_number,
      key: "account",
    },
    {
      label: "Chủ tài khoản",
      value: bank.account_name,
      copyValue: bank.account_name,
      key: "accountName",
    },
    {
      label: "Mã đơn hàng",
      value: payment?.orderCode || payment?.orderId,
      copyValue: payment?.orderCode || payment?.orderId,
      key: "order",
    },
    {
      label: "Số tiền",
      value: fmt(payment?.amount),
      copyValue: payment?.amount,
      key: "amount",
      highlight: true,
    },
    {
      label: isSePay
        ? "Nội dung chuyển khoản bắt buộc"
        : "Mã tham chiếu đơn hàng",
      value: payment?.transferNote,
      copyValue: payment?.transferNote,
      key: "note",
      highlight: true,
    },
  ].filter((item) => item.value);
  const paymentSteps = isSePay
    ? [
      "Mở ứng dụng ngân hàng và chọn quét mã QR.",
      "Kiểm tra số tiền cùng nội dung chuyển khoản đã được điền sẵn.",
      "Xác nhận giao dịch; trang này sẽ tự cập nhật khi SePay xác nhận.",
    ]
    : [
      "Mở ứng dụng ngân hàng của bạn.",
      "Nhập đúng số tài khoản, tên chủ tài khoản và số tiền ở trên.",
      "Ghi mã tham chiếu đơn hàng để cửa hàng kiểm tra giao dịch nhanh hơn.",
    ];

  useEffect(() => {
    if (payment || !orderIdFromUrl) {
      return undefined;
    }

    let active = true;

    const loadPayment = async () => {
      try {
        const response = await getOrderById(orderIdFromUrl);
        const order = response.data;
        const nextPayment = {
          orderId: order.order_id,
          orderCode: order.order_code,
          amount: order.final_amount,
          paymentMethod: order.payment_method,
          transferNote: order.payment?.transfer_note || order.order_code,
          qrUrl: order.payment?.qr_url,
          bank: order.payment?.bank,
        };

        if (!active) return;

        setPayment(nextPayment);

        try {
          sessionStorage.setItem(
            `selene:payment:${order.order_id}`,
            JSON.stringify(nextPayment),
          );
        } catch {
          // Router state vẫn đủ để hiển thị phiên hiện tại nếu sessionStorage bị chặn.
        }
      } catch (error) {
        console.error("Không thể tải thông tin thanh toán:", error);
      } finally {
        if (active) setPaymentLoading(false);
      }
    };

    loadPayment();

    return () => {
      active = false;
    };
  }, [orderIdFromUrl, payment]);

  useEffect(() => {
    if (!isSePay || !payment?.orderId || paid) {
      return undefined;
    }

    let active = true;

    const checkPaymentStatus = async () => {
      try {
        const response = await getOrderById(payment.orderId);
        const order = response.data;

        if (
          active &&
          (order.payment_status === "paid" || order.status === "confirmed")
        ) {
          setPaid(true);
        }
      } catch (error) {
        // Một lượt polling lỗi không nên làm gián đoạn phiên thanh toán.
        console.error("Không thể kiểm tra trạng thái thanh toán:", error);
      }
    };

    checkPaymentStatus();
    const intervalId = window.setInterval(checkPaymentStatus, 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [isSePay, paid, payment?.orderId]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(String(text || ""));

      setCopied(key);

      setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch (error) {
      console.error(error);
    }
  };

  if (paymentLoading) {
    return (
      <>
        <Helmet>
          <title>Đang tải thanh toán | Selene</title>
        </Helmet>

        <Breadcrumb
          items={[
            { label: "Trang chủ", path: "/" },
            { label: "Giỏ hàng", path: "/gio-hang" },
            { label: "Thanh toán" },
          ]}
        />

        <div className="py-5 text-center">
          <div className="spinner-border text-dark" role="status">
            <span className="visually-hidden">Đang tải</span>
          </div>
        </div>
      </>
    );
  }

  /*
   * Không có payment state
   */
  if (!payment) {
    return (
      <>
        <Helmet>
          <title>Thanh toán | Selene</title>
        </Helmet>

        <Breadcrumb
          items={[
            { label: "Trang chủ", path: "/" },
            { label: "Giỏ hàng", path: "/gio-hang" },
            { label: "Thanh toán" },
          ]}
        />

        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            background: "#fff",
          }}
        >
          <i
            className="bi bi-exclamation-circle"
            style={{
              fontSize: 64,
              color: "#e0e0e0",
              display: "block",
              marginBottom: 20,
            }}
          />

          <h4
            style={{
              fontWeight: 800,
              color: "#212529",
              marginBottom: 8,
            }}
          >
            Không tìm thấy thông tin thanh toán
          </h4>

          <p
            style={{
              color: "#6c757d",
              marginBottom: 28,
            }}
          >
            Phiên thanh toán không hợp lệ hoặc đã hết hạn.
          </p>

          <button
            className="btn btn-dark rounded-pill px-5"
            onClick={() => navigate("/gio-hang")}
          >
            Về giỏ hàng
          </button>
        </div>
      </>
    );
  }

  /*
   * Thanh toán thành công
   */
  if (paid) {
    return (
      <>
        <Helmet>
          <title>Thanh toán thành công | Selene</title>
        </Helmet>

        <Breadcrumb
          items={[{ label: "Trang chủ", path: "/" }, { label: "Thanh toán" }]}
        />

        <div
          style={{
            padding: "80px 24px",
            textAlign: "center",
            background: "#fff",
          }}
        >
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "#198754",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <i className="bi bi-check-lg" style={{ fontSize: 42 }} />
          </div>

          <h2
            style={{
              fontWeight: 800,
              marginBottom: 10,
            }}
          >
            Thanh toán thành công!
          </h2>

          <p
            style={{
              color: "#6c757d",
              marginBottom: 30,
            }}
          >
            Đơn hàng của bạn đã được xác nhận.
          </p>

          <div
            style={{
              maxWidth: 450,
              margin: "0 auto 30px",
              border: "1px solid #eee",
              borderRadius: 14,
              padding: 20,
              textAlign: "left",
            }}
          >
            <div className="d-flex justify-content-between mb-3">
              <span>Mã đơn hàng</span>
              <strong>{payment.orderCode || payment.transferNote}</strong>
            </div>

            <div className="d-flex justify-content-between">
              <span>Số tiền</span>
              <strong>{fmt(payment.amount)}</strong>
            </div>
          </div>

          <button
            className="btn btn-dark rounded-pill px-5"
            onClick={() => navigate("/tai-khoan/don-hang")}
          >
            <i className="bi bi-bag-check me-2" />
            Xem đơn hàng
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {isSePay ? "Thanh toán QR qua SePay" : "Chuyển khoản ngân hàng"} |
          {" Selene"}
        </title>
      </Helmet>

      <style>{`
        .payment-page {
          padding: 32px 75px 72px;
          background: #fff;
          min-height: 70vh;
        }

        .payment-card {
          background: #fff;
          border: 1.5px solid #f0f0f0;
          border-radius: 16px;
          padding: 28px 24px;
        }

        .payment-title {
          font-size: 20px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .5px;
          color: #212529;
        }

        .payment-subtitle {
          color: #6c757d;
          font-size: 14px;
        }

        .qr-wrapper {
          display: inline-block;
          padding: 14px;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 16px;
        }

        .qr-wrapper img {
          width: 280px;
          height: 280px;
          object-fit: contain;
          display: block;
        }

        .payment-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 14px 16px;
          background: #f8f9fa;
          border-radius: 10px;
          margin-bottom: 10px;
        }

        .payment-info-label {
          font-size: 12px;
          color: #6c757d;
          margin-bottom: 3px;
        }

        .payment-info-value {
          font-size: 14px;
          font-weight: 700;
          color: #212529;
        }

        .copy-btn {
          border: none;
          background: #212529;
          color: #fff;
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .copy-btn.copied {
          background: #198754;
        }

        .payment-amount {
          font-size: 28px;
          font-weight: 900;
          color: #871B1B;
        }

        .payment-timer {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border-radius: 50px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          font-weight: 800;
          color: #212529;
        }

        .payment-warning {
          background: #fff8e1;
          border: 1px solid #ffe082;
          border-radius: 10px;
          padding: 13px 15px;
          color: #856404;
          font-size: 13px;
          line-height: 1.5;
        }

        @media (max-width: 1520px) {
          .payment-page {
            padding: 28px 24px 56px;
          }
        }

        @media (max-width: 768px) {
          .qr-wrapper img {
            width: 230px;
            height: 230px;
          }
        }
      `}</style>

      <Breadcrumb
        items={[
          { label: "Trang chủ", path: "/" },
          { label: "Giỏ hàng", path: "/gio-hang" },
          { label: "Thanh toán" },
        ]}
      />

      <div className="payment-page">
        <div className="d-flex align-items-center gap-3 mb-4">
          <button
            className="btn btn-light rounded-circle"
            type="button"
            onClick={() => navigate("/gio-hang")}
          >
            <i className="bi bi-arrow-left" />
          </button>

          <div>
            <h1 className="payment-title mb-1">
              {isSePay ? "Thanh toán QR qua SePay" : "Chuyển khoản ngân hàng"}
            </h1>

            <div className="payment-subtitle">
              {isSePay
                ? "Quét mã QR bằng ứng dụng ngân hàng để thanh toán"
                : "Chuyển khoản theo thông tin tài khoản của cửa hàng"}
            </div>
          </div>
        </div>

        <div className="row g-5 align-items-start">
          {/* QR */}
          <div className="col-12 col-lg-5">
            <div className="payment-card text-center">
              {isSePay ? (
                <>
                  <div className="mb-3">
                    <span className="badge text-bg-dark px-3 py-2 rounded-pill">
                      <i className="bi bi-qr-code me-2" />
                      SePay QR
                    </span>
                  </div>

                  {payment.qrUrl ? (
                    <div className="qr-wrapper mb-3">
                      <img src={payment.qrUrl} alt="QR thanh toán SePay" />
                    </div>
                  ) : (
                    <p className="text-danger small mb-3">
                      Không thể tạo mã QR. Vui lòng dùng thông tin chuyển khoản
                      bên phải.
                    </p>
                  )}

                  <div className="mb-3">
                    <div className="text-muted small mb-2">
                      Trạng thái thanh toán
                    </div>

                    <div className="payment-timer">
                      <span
                        className="spinner-grow spinner-grow-sm"
                        aria-hidden="true"
                      />
                      Đang chờ SePay xác nhận
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: 104,
                      height: 104,
                      borderRadius: "50%",
                      background: "#f8f9fa",
                      fontSize: 42,
                    }}
                  >
                    <i className="bi bi-bank" />
                  </div>
                  <h5 className="fw-bold">Đơn hàng đã được ghi nhận</h5>
                  <p className="text-muted small mb-4">
                    Vui lòng chuyển khoản theo thông tin bên phải để cửa hàng
                    xác nhận giao dịch.
                  </p>
                </>
              )}

              <div
                style={{
                  borderTop: "1px dashed #ddd",
                  paddingTop: 18,
                }}
              >
                <div className="text-muted small">Số tiền cần thanh toán</div>

                <div className="payment-amount">{fmt(payment.amount)}</div>
              </div>
            </div>
          </div>

          {/* INFO */}
          <div className="col-12 col-lg-7">
            <div className="payment-card">
              <h5
                style={{
                  fontWeight: 800,
                  marginBottom: 20,
                }}
              >
                Thông tin thanh toán
              </h5>

              {paymentInformation.map((item) => (
                <div className="payment-info" key={item.key}>
                  <div>
                    <div className="payment-info-label">{item.label}</div>

                    <div
                      className="payment-info-value"
                      style={
                        item.highlight
                          ? {
                            color: "#871B1B",
                            fontSize: 16,
                          }
                          : undefined
                      }
                    >
                      {item.value}
                    </div>
                  </div>

                  <button
                    className={`copy-btn ${copied === item.key ? "copied" : ""
                      }`}
                    type="button"
                    onClick={() => copyToClipboard(item.copyValue, item.key)}
                  >
                    {copied === item.key ? "Đã sao chép" : "Sao chép"}
                  </button>
                </div>
              ))}

              <div className="mt-4">
                <h6
                  style={{
                    fontWeight: 800,
                    marginBottom: 15,
                  }}
                >
                  Hướng dẫn thanh toán
                </h6>

                {paymentSteps.map((text, index) => (
                  <div
                    key={index}
                    className="d-flex align-items-start gap-3 mb-3"
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#212529",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </div>

                    <span
                      style={{
                        fontSize: 14,
                        paddingTop: 4,
                      }}
                    >
                      {text}
                    </span>
                  </div>
                ))}
              </div>

              <div className="payment-warning mt-4">
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {isSePay
                  ? "Vui lòng chuyển khoản đúng số tiền và nội dung để SePay tự động xác nhận thanh toán."
                  : "Đơn hàng đang chờ cửa hàng kiểm tra và xác nhận giao dịch chuyển khoản."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
