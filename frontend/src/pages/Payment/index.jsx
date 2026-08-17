// frontend\src\pages\Payment\index.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import Breadcrumb from "../../components/layout/Breadcrumb";

const fmt = (n) => Number(n || 0).toLocaleString("vi-VN") + "đ";

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const payment = location.state;

  const [copied, setCopied] = useState(null);
  const [seconds, setSeconds] = useState(15 * 60);
  const [paid, setPaid] = useState(false);

  const intervalRef = useRef(null);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const isExpired = seconds === 0;

  useEffect(() => {
    if (isExpired || paid) return;

    intervalRef.current = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isExpired, paid]);

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
              <strong>{payment.orderId}</strong>
            </div>

            <div className="d-flex justify-content-between">
              <span>Số tiền</span>
              <strong>{fmt(payment.amount)}</strong>
            </div>
          </div>

          <button
            className="btn btn-dark rounded-pill px-5"
            onClick={() => navigate("/don-hang")}
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
        <title>Thanh toán QR | Selene</title>
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
            onClick={() => navigate(-1)}
          >
            <i className="bi bi-arrow-left" />
          </button>

          <div>
            <h1 className="payment-title mb-1">Thanh toán QR</h1>

            <div className="payment-subtitle">
              Quét mã QR bằng ứng dụng ngân hàng để thanh toán
            </div>
          </div>
        </div>

        <div className="row g-5 align-items-start">
          {/* QR */}
          <div className="col-12 col-lg-5">
            <div className="payment-card text-center">
              <div className="mb-3">
                <span className="badge text-bg-dark px-3 py-2 rounded-pill">
                  <i className="bi bi-qr-code me-2" />
                  SePay QR
                </span>
              </div>

              <div className="qr-wrapper mb-3">
                <img src={payment.qrUrl} alt="QR thanh toán SePay" />
              </div>

              <div className="mb-3">
                <div className="text-muted small mb-2">Mã QR còn hiệu lực</div>

                <div className="payment-timer">
                  <i className="bi bi-clock" />

                  {isExpired ? "Hết hạn" : `${mm}:${ss}`}
                </div>
              </div>

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

              <div className="payment-info">
                <div>
                  <div className="payment-info-label">Mã đơn hàng</div>

                  <div className="payment-info-value">{payment.orderId}</div>
                </div>

                <button
                  className={`copy-btn ${copied === "order" ? "copied" : ""}`}
                  onClick={() => copyToClipboard(payment.orderId, "order")}
                >
                  {copied === "order" ? "Đã copy" : "Copy"}
                </button>
              </div>

              <div className="payment-info">
                <div>
                  <div className="payment-info-label">Số tiền</div>

                  <div
                    className="payment-info-value"
                    style={{
                      color: "#871B1B",
                      fontSize: 16,
                    }}
                  >
                    {fmt(payment.amount)}
                  </div>
                </div>

                <button
                  className={`copy-btn ${copied === "amount" ? "copied" : ""}`}
                  onClick={() => copyToClipboard(payment.amount, "amount")}
                >
                  {copied === "amount" ? "Đã copy" : "Copy"}
                </button>
              </div>

              <div className="payment-info">
                <div>
                  <div className="payment-info-label">
                    Nội dung chuyển khoản
                  </div>

                  <div
                    className="payment-info-value"
                    style={{
                      color: "#871B1B",
                      fontSize: 16,
                    }}
                  >
                    {payment.transferNote}
                  </div>
                </div>

                <button
                  className={`copy-btn ${copied === "note" ? "copied" : ""}`}
                  onClick={() => copyToClipboard(payment.transferNote, "note")}
                >
                  {copied === "note" ? "Đã copy" : "Copy"}
                </button>
              </div>

              <div className="mt-4">
                <h6
                  style={{
                    fontWeight: 800,
                    marginBottom: 15,
                  }}
                >
                  Hướng dẫn thanh toán
                </h6>

                {[
                  "Mở ứng dụng ngân hàng.",
                  "Chọn chức năng quét mã QR.",
                  "Kiểm tra số tiền và nội dung chuyển khoản.",
                  "Xác nhận giao dịch.",
                ].map((text, index) => (
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
                Vui lòng chuyển khoản đúng số tiền và nội dung chuyển khoản để
                hệ thống có thể tự động xác nhận thanh toán.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
