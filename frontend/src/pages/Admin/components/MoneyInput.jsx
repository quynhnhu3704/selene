import { useEffect, useRef } from "react";

export default function MoneyInput({ value, onChange, min = 0, max, className = "form-control", ...props }) {
  const inputRef = useRef(null);
  useEffect(() => {
    const amount = Number(value);
    inputRef.current?.setCustomValidity(
      value !== "" && value != null && (!Number.isSafeInteger(amount) || amount < min)
        ? `Nhập số tiền nguyên từ ${Number(min).toLocaleString("vi-VN")} đ.`
        : value !== "" && max != null && amount > Number(max)
          ? `Số tiền không được vượt quá ${Number(max).toLocaleString("vi-VN")} đ.`
          : "",
    );
  }, [value, min, max]);

  return (
    <div className="input-group flex-nowrap">
      <input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className={className}
        placeholder={props.placeholder || "VD: 200.000"}
        value={value === "" || value == null ? "" : Number(value).toLocaleString("vi-VN")}
        onChange={(event) => {
          const raw = event.target.value.replace(/\D/g, "");
          onChange({ target: { value: raw, name: props.name, id: props.id } });
        }}
      />
      <span className="input-group-text text-muted">đ</span>
    </div>
  );
}
