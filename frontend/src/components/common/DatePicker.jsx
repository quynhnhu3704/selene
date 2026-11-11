import ReactDatePicker from "react-datepicker";
import { format, isValid, parseISO } from "date-fns";

// The account calendar is the shared date picker for all Selene forms.
export default function DatePicker(props) {
  return (
    <ReactDatePicker
      dateFormat="dd/MM/yyyy"
      placeholderText="dd/mm/yyyy"
      className="form-control"
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      showPopperArrow={false}
      portalId="selene-datepicker-portal"
      popperPlacement="bottom-start"
      popperProps={{ strategy: "fixed" }}
      strictParsing
      {...props}
    />
  );
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : parseISO(value);
  return isValid(date) ? date : null;
}

// Preserve the YYYY-MM-DD values expected by forms and APIs, in local time.
export function DateInput({ value, onChange, min, max, name, id, "aria-label": ariaLabel, ...props }) {
  return (
    <DatePicker
      {...props}
      id={id}
      name={name}
      aria-label={ariaLabel}
      selected={parseDate(value)}
      minDate={parseDate(min)}
      maxDate={parseDate(max)}
      onChange={(date) => onChange?.({
        target: { name, id, value: date ? format(date, "yyyy-MM-dd") : "" },
      })}
    />
  );
}
