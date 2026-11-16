export default function ConnectionErrorState({ message, onRetry }) {
  return (
    <div className="adm-connection-error-state" role="alert">
      <span className="adm-connection-error-icon" aria-hidden="true">
        <i className="bi bi-cloud-slash" />
      </span>
      <p className="adm-connection-error-message">{message}</p>
      <button type="button" className="form-btn btn btn-retry btn-outline-dark px-4 mb-0" onClick={onRetry}>
        <i className="bi bi-arrow-clockwise me-2" aria-hidden="true" />
        Thử lại
      </button>
    </div>
  );
}
