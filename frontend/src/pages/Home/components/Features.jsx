const features = [
  { icon: "bi-truck", title: "Miễn phí vận chuyển", description: "Trong khu vực TP.HCM" },
  { icon: "bi-credit-card", title: "Đặc quyền thành viên", description: "Tích điểm & nâng hạng" },
  { icon: "bi-wallet2", title: "Thanh toán linh hoạt", description: "Đa dạng phương thức" },
  { icon: "bi-shield-check", title: "An tâm mua sắm", description: "Hoàn tiền 100% nếu sản phẩm lỗi" },
];

export default function Features() {
  return (
    <section className="rb-features" aria-label="Quyền lợi mua sắm tại Selene">
      <ul className="rb-features-list">
        {features.map(({ icon, title, description }) => (
          <li className="rb-feat-item" key={title}>
            <i className={`bi ${icon} rb-feat-icon`} aria-hidden="true" />
            <div>
              <div className="rb-feat-t1">{title}</div>
              <div className="rb-feat-t2">{description}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
