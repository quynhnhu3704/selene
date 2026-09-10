// frontend/src/components/common/Loading.jsx
export default function Loading({ text }) {
  return (
    <div className="spinner-loading">
      <div className="d-flex flex-column align-items-center">
        <div className="spinner-border text-dark" role="status" />
        {text && (
          <span className="mt-3 mb-0 text-muted" style={{ fontSize: 14 }}>
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
