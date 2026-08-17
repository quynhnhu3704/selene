// frontend\src\pages\Home\components\Features.jsx
export default function Features() {
  return (
    <div className="rb-features">
      <div className="row g-0">
        <div className="col-3">
          <div className="rb-feat-item">
            <i className="bi bi-truck" style={{ fontSize: 28 }} />
            <div>
              <div className="rb-feat-t1">
                Vận chuyển <strong>MIỄN PHÍ</strong>
              </div>
              <div className="rb-feat-t2">Trong khu vực TP.HCM</div>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className="rb-feat-item">
            <i className="bi bi-credit-card" style={{ fontSize: 28 }} />
            <div>
              <div className="rb-feat-t1">Tích điểm Nâng hạng</div>
              <div className="rb-feat-t2">Thẻ Thành Viên</div>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className="rb-feat-item">
            <i className="bi bi-cash-coin" style={{ fontSize: 28 }} />
            <div>
              <div className="rb-feat-t1">
                Tiến hành <strong>THANH TOÁN</strong>
              </div>
              <div className="rb-feat-t2">Với nhiều Phương Thức</div>
            </div>
          </div>
        </div>
        <div className="col-3">
          <div className="rb-feat-item" style={{ borderRight: "none" }}>
            <i className="bi bi-shield-check" style={{ fontSize: 28 }} />
            <div>
              <div className="rb-feat-t1">
                <strong>100% HOÀN TIỀN</strong>
              </div>
              <div
                className="rb-feat-t2"
                style={{ fontWeight: 500, textTransform: "none" }}
              >
                nếu sản phẩm lỗi
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
