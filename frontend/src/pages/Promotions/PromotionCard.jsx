import styles from "./promotions.module.css";

const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const compactMoney = (value) => {
  const amount = Number(value || 0);
  return amount >= 1000 && amount % 1000 === 0
    ? `${(amount / 1000).toLocaleString("vi-VN")}k`
    : money(amount);
};

export default function PromotionCard({ voucher, variant = 0, onCopy }) {
  const percentage = voucher.discount_type === "percentage";
  const shipping = voucher.discount_type === "free_shipping";
  const minimum = voucher.min_order_value ?? voucher.min_order;
  const capped = percentage && Number(voucher.max_discount_amount) > 0;

  return (
    <article className={styles.card}>
      <div className={`${styles.stub} ${variant === 0 ? styles.deep : variant === 1 ? styles.summer : styles.shopping}`}>
        <strong className={styles.amount}>
          {shipping ? <i className="bi bi-truck" aria-label="Miễn phí vận chuyển" /> : percentage ? `-${voucher.discount_value}%` : `-${compactMoney(voucher.discount_value)}`}
        </strong>
        <span>{capped ? `Tối đa ${compactMoney(voucher.max_discount_amount)}` : shipping ? "Miễn phí ship" : `Đơn từ ${compactMoney(minimum)}`}</span>
      </div>
      <div className={styles.details}>
        <div className={styles.heading}>
          <h2>{voucher.name}</h2>
          <i className="bi bi-ticket-perforated" aria-hidden="true" />
        </div>
        <p className={styles.discount}>{shipping ? "Ưu đãi vận chuyển" : percentage ? `Giảm ${voucher.discount_value}%` : `Giảm ${money(voucher.discount_value)}`}</p>
        <p className={styles.conditions}>
          Đơn tối thiểu {money(minimum)}
          {capped && <> · Giảm tối đa {money(voucher.max_discount_amount)}</>}
        </p>
        <div className={styles.actions}>
          <span className={styles.code}>{voucher.code}</span>
          <button type="button" className={styles.copy} onClick={() => onCopy(voucher)} aria-label={`Sao chép mã ${voucher.code}`} title={`Sao chép mã ${voucher.code}`}>
            <i className="bi bi-copy" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
