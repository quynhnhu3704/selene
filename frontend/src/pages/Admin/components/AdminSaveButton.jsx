export default function AdminSaveButton({ children, saving = false, disabled = false, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className="form-btn btn btn-dark mb-0"
      disabled={disabled || saving}
      aria-busy={saving}
    >
      {saving ? (
        <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
      ) : (
        <i className="bi bi-check-lg me-1" aria-hidden="true" />
      )}{" "}
      {saving ? "Đang lưu..." : children}
    </button>
  );
}
