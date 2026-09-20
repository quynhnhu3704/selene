// frontend\src\components\common\Address.jsx
import Loading from "./Loading";
import { useEffect, useRef, useState } from "react";

const API = "https://provinces.open-api.vn/api/v2";

export default function Address({
  onChange,
  optional = false,
  initialAddress = "",
  inputClassName = "form-control",
  invalid = false,
}) {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const [area, setArea] = useState("");
  const [detail, setDetail] = useState(initialAddress);
  const [initializing, setInitializing] = useState(Boolean(initialAddress));
  const [openDropdown, setOpenDropdown] = useState("");
  const addressRef = useRef(null);

  const handleAddressChange = (nextArea, nextDetail) => {
    const address = [nextDetail.trim(), nextArea].filter(Boolean).join(", ");
    onChange(address, nextArea, nextDetail);
  };

  const handleProvinceSelect = (value) => {
    setProvince(value);
    setWard("");
    setWards([]);
    setInitializing(false);
    const selectedProvince = provinces.find((item) => String(item.code) === value);
    const nextArea = optional ? selectedProvince?.name || "" : null;
    handleAddressChange(nextArea, detail);
    setArea(nextArea || "");
    setOpenDropdown("");
  };

  const handleWardSelect = (value) => {
    setWard(value);
    const selectedWard = wards.find((item) => String(item.code) === value);
    const selectedProvince = provinces.find((item) => String(item.code) === province);
    const nextArea = selectedWard && selectedProvince
      ? `${selectedWard.name}, ${selectedProvince.name}`
      : optional ? selectedProvince?.name || "" : null;
    handleAddressChange(nextArea, detail);
    setArea(nextArea || "");
    setOpenDropdown("");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (addressRef.current && !addressRef.current.contains(e.target)) {
        setOpenDropdown("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        if (province) {
          setWards(data.wards || []);
          if (initializing) {
            const selectedProvince = provinces.find((item) => String(item.code) === province);
            const selectedWard = (data.wards || []).find((item) =>
              initialAddress.endsWith(`${item.name}, ${selectedProvince?.name}`),
            );
            const nextArea = selectedWard
              ? `${selectedWard.name}, ${selectedProvince.name}`
              : selectedProvince?.name || "";
            const nextDetail = nextArea
              ? initialAddress.slice(0, -nextArea.length).replace(/,\s*$/, "")
              : initialAddress;
            if (selectedWard) setWard(String(selectedWard.code));
            setArea(nextArea);
            setDetail(nextDetail);
            setInitializing(false);
          }
        } else {
          setProvinces(data);
          if (initializing) {
            const selectedProvince = data.find((item) => initialAddress.endsWith(item.name));
            if (selectedProvince) setProvince(String(selectedProvince.code));
            else setInitializing(false);
          }
        }
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
    <>
      <div className="row g-3 mb-3 mx-0" ref={addressRef}>
        <div className="info-field col-md-6">
          <label htmlFor="shipping-province" className="info-field-label">
            Tỉnh/Thành phố
            {!optional && <span className="text-danger ms-1">*</span>}
          </label>
          <div className="dropdown w-100">
            <button
              id="shipping-province"
              type="button"
              className="form-control text-start d-flex justify-content-between align-items-center"
              disabled={initializing}
              aria-expanded={openDropdown === "province"}
              onClick={() => setOpenDropdown((prev) => prev === "province" ? "" : "province")}
            >
              <span>
                {provinces.find((item) => String(item.code) === province)?.name || "Chọn tỉnh/thành phố"}
              </span>
              <i className={`bi ${openDropdown === "province" ? "bi-caret-up" : "bi-caret-down"}`} />
            </button>
            {openDropdown === "province" && (
              <ul
                className="dropdown-menu show w-100 mt-1 shadow-sm"
                style={{ maxHeight: 240, overflowY: "auto" }}
              >
                <li>
                  <button
                    type="button"
                    className="dropdown-item fw-normal"
                    onClick={() => handleProvinceSelect("")}
                  >
                    Chọn tỉnh/thành phố
                  </button>
                </li>
                {provinces.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      className="dropdown-item fw-normal"
                      onClick={() => handleProvinceSelect(String(item.code))}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="info-field col-md-6">
          <label htmlFor="shipping-ward" className="info-field-label">
            Phường/Xã
            {!optional && <span className="text-danger ms-1">*</span>}
          </label>
          <div className="dropdown w-100">
            <button
              id="shipping-ward"
              type="button"
              className="form-control text-start d-flex justify-content-between align-items-center"
              disabled={!province || loading || initializing}
              aria-expanded={openDropdown === "ward"}
              onClick={() => setOpenDropdown((prev) => prev === "ward" ? "" : "ward")}
            >
              <span>
                {wards.find((item) => String(item.code) === ward)?.name || "Chọn phường/xã"}
              </span>
              <i className={`bi ${openDropdown === "ward" ? "bi-caret-up" : "bi-caret-down"}`} />
            </button>
            {openDropdown === "ward" && (
              <ul
                className="dropdown-menu show w-100 mt-1 shadow-sm"
                style={{ maxHeight: 240, overflowY: "auto" }}
              >
                <li>
                  <button
                    type="button"
                    className="dropdown-item fw-normal"
                    onClick={() => handleWardSelect("")}
                  >
                    Chọn phường/xã
                  </button>
                </li>
                {wards.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      className="dropdown-item fw-normal"
                      onClick={() => handleWardSelect(String(item.code))}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {loading && <Loading text="Đang tải địa chỉ…" />}
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
      <label htmlFor="shipping-address-detail" className="info-field-label">
        Địa chỉ chi tiết
        {!optional && <span className="text-danger ms-1">*</span>}
      </label>
      <input
        id="shipping-address-detail"
        type="text"
        name="address"
        className={inputClassName}
        placeholder="Nhập số nhà, tên đường, thôn, ấp..."
        value={initializing ? "" : detail}
        onChange={(event) => {
          setDetail(event.target.value);
          handleAddressChange(area, event.target.value);
        }}
        disabled={initializing}
        autoComplete="street-address"
        aria-invalid={invalid}
      />
    </>
  );
}
