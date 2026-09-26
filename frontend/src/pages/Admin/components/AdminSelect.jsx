import { Children, useEffect, useId, useRef, useState } from "react";

export default function AdminSelect({ children, className = "", icon, id, ...props }) {
  const generatedId = useId();
  const controlId = id || generatedId;
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const selectRef = useRef(null);
  const searchRef = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const options = Children.toArray(children).filter((child) => child.type === "option");
  const selected = options.find((option) => String(option.props.value) === String(props.value)) || options[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, [open]);

  const choose = (value) => {
    const select = selectRef.current;
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => {
        const items = [...rootRef.current.querySelectorAll('[role="option"]:not(:disabled)')];
        const index = items.indexOf(document.activeElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
          : event.key === "ArrowDown" ? (index + 1) % items.length
            : (index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length);
        items[next]?.focus();
      });
    } else if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - searchRef.current.time < 700 ? searchRef.current.text : "") + event.key.toLocaleLowerCase();
      searchRef.current = { text, time: now };
      setOpen(true);
      requestAnimationFrame(() => {
        const items = [...rootRef.current.querySelectorAll('[role="option"]:not(:disabled)')];
        items.find((item) => item.textContent.trim().toLocaleLowerCase().startsWith(text))?.focus();
      });
    }
  };

  return (
    <div className={`dropdown adm-select ${className}`} ref={rootRef} onKeyDown={handleKeyDown}>
      {/* Keep native form validation and change events for existing forms. */}
      <select
        {...props}
        ref={selectRef}
        className="adm-select-native"
        tabIndex={-1}
        aria-hidden="true"
        onInvalid={(event) => {
          event.preventDefault();
          buttonRef.current?.focus();
          setOpen(true);
        }}
      >
        {children}
      </select>
      <button
        id={controlId}
        ref={buttonRef}
        type="button"
        className="form-control adm-select-trigger text-start d-flex justify-content-between align-items-center gap-2"
        disabled={props.disabled}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-haspopup="listbox"
        aria-expanded={open && !props.disabled}
        aria-controls={`${controlId}-options`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="adm-select-label">
          {icon && <i className={`bi ${icon} me-2`} aria-hidden="true" />}
          {selected?.props.children}
        </span>
        <i className={`bi bi-caret-${open ? "up" : "down"}`} aria-hidden="true" />
      </button>
      {open && !props.disabled && (
        <ul id={`${controlId}-options`} role="listbox" aria-labelledby={controlId} className="adm-select-menu w-100 mt-1 shadow-sm">
          {options.map((option) => (
            <li key={option.props.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option === selected}
                disabled={option.props.disabled}
                className="dropdown-item fw-normal"
                onClick={() => choose(option.props.value)}
              >
                {option.props.children}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
