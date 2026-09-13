// frontend\src\components\common\Address.jsx
import { useEffect, useState } from "react";

const API = "https://provinces.open-api.vn/api/v2";

export default function Address({ onChange }) {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(province ? `${API}/p/${province}?depth=2` : `${API}/p/`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Không thể tải danh sách địa chỉ.");
        return response.json();
      })
      .then((data) => {
        if (province) setWards(data.wards || []);
        else setProvinces(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setError("Không thể tải địa chỉ. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [province, retry]);

  return (
    <div className="row g-3 mb-3">
      <div className="col-md-6">
        <label htmlFor="shipping-province" className="checkout-label">
          Tỉnh / Thành phố *
        </label>
        <select
          id="shipping-province"
          className="checkout-input"
          value={province}
          onChange={(event) => {
            setProvince(event.target.value);
            setWard("");
            setWards([]);
            onChange(null);
          }}
        >
          <option value="">Chọn tỉnh / thành phố</option>
          {provinces.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-6">
        <label htmlFor="shipping-ward" className="checkout-label">
          Phường / Xã *
        </label>
        <select
          id="shipping-ward"
          className="checkout-input"
          value={ward}
          disabled={!province || loading}
          onChange={(event) => {
            setWard(event.target.value);
            const selectedWard = wards.find(
              (item) => String(item.code) === event.target.value,
            );
            const selectedProvince = provinces.find(
              (item) => String(item.code) === province,
            );
            onChange(
              selectedWard && selectedProvince
                ? `${selectedWard.name}, ${selectedProvince.name}`
                : null,
            );
          }}
        >
          <option value="">Chọn phường / xã</option>
          {wards.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      {loading && <div role="status">Đang tải địa chỉ…</div>}
      {error && (
        <div role="alert" className="text-danger">
          {error}{" "}
          <button
            type="button"
            className="btn btn-link"
            onClick={() => setRetry((value) => value + 1)}
          >
            Thử lại
          </button>
        </div>
      )}
    </div>
  );
}
