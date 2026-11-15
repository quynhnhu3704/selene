import styles from "./ConnectionErrorState.module.css";

export default function ConnectionErrorState({ message, onRetry }) {
  return (
    <div className={styles.state} role="alert">
      <span className={styles.icon} aria-hidden="true">
        <i className="bi bi-cloud-slash" />
      </span>
      <p className={styles.message}>{message}</p>
      <button type="button" className="form-btn btn btn-retry btn-outline-dark px-4 mb-0" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
        Thử lại
      </button>
    </div>
  );
}
