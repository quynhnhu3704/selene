import { useEffect, useRef } from "react";

export default function PermissionCheckbox({
  checked,
  mixed = false,
  disabled,
  label,
  onChange,
}) {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current.indeterminate = mixed;
  }, [mixed]);

  return (
    <input
      ref={inputRef}
      type="checkbox"
      className="form-check-input m-0"
      checked={checked}
      disabled={disabled}
      aria-label={label}
      aria-checked={mixed ? "mixed" : checked}
      onChange={onChange}
    />
  );
}
