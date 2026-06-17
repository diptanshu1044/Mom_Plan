"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import DatePicker from "react-datepicker";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DOB_DISPLAY_FORMAT,
  formatDobDisplay,
  formatIsoDateLocal,
  getAdultDobBounds,
  getChildDobBounds,
  parseIsoDateLocal,
  validateDateOfBirth,
  validateDobInput,
  type DateOfBirthBounds,
} from "@/lib/date-of-birth";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker-overrides.css";

interface DatePickerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputClassName: string;
  onIconClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(
  ({ inputClassName, onIconClick, className, ...props }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        className={cn(inputClassName, className)}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Open calendar"
        disabled={props.disabled}
        onClick={(event) => {
          onIconClick?.(event);
          props.onClick?.(event as unknown as React.MouseEvent<HTMLInputElement>);
        }}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <Calendar className="w-4 h-4 pointer-events-none" aria-hidden />
      </button>
    </div>
  )
);
DatePickerInput.displayName = "DatePickerInput";

export interface DateOfBirthPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Adult DOB: 16–100 years. Child DOB: 0–18 years. */
  variant?: "adult" | "child";
  minAge?: number;
  maxAge?: number;
  error?: string;
  onValidationChange?: (error: string | null) => void;
  className?: string;
  "aria-describedby"?: string;
}

export function DateOfBirthPicker({
  value,
  onChange,
  id,
  name,
  placeholder = "MM/DD/YYYY",
  disabled = false,
  required = false,
  variant = "adult",
  minAge = 16,
  maxAge = 100,
  error: externalError,
  onValidationChange,
  className,
  "aria-describedby": ariaDescribedBy,
}: DateOfBirthPickerProps) {
  const generatedId = useId();
  const inputId = id ?? `dob-picker-${generatedId}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const bounds: DateOfBirthBounds = useMemo(
    () =>
      variant === "child"
        ? getChildDobBounds(maxAge)
        : getAdultDobBounds(minAge, maxAge),
    [variant, minAge, maxAge]
  );

  const selectedDate = useMemo(() => parseIsoDateLocal(value), [value]);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(() => formatDobDisplay(value));
  const [isMounted, setIsMounted] = useState(false);
  const skipInputSyncRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const displayError = externalError ?? internalError ?? null;

  const reportValidation = useCallback(
    (message: string | null) => {
      setInternalError(message);
      onValidationChange?.(message);
    },
    [onValidationChange]
  );

  useEffect(() => {
    if (skipInputSyncRef.current) {
      skipInputSyncRef.current = false;
      return;
    }
    setInputText(formatDobDisplay(value));
  }, [value]);

  const applyValidDate = useCallback(
    (date: Date | null) => {
      const result = validateDateOfBirth(date, bounds, {
        required,
        minAge: variant === "child" ? 0 : minAge,
        maxAge: variant === "child" ? maxAge : maxAge,
      });

      if (!result.valid) {
        reportValidation(result.message);
        return false;
      }

      reportValidation(null);
      skipInputSyncRef.current = true;
      onChange(result.iso);
      setInputText(result.iso ? formatDobDisplay(result.iso) : "");
      return true;
    },
    [bounds, minAge, maxAge, onChange, reportValidation, required, variant]
  );

  const handleCalendarChange = (date: Date | null) => {
    if (!date) {
      if (!required) {
        reportValidation(null);
        skipInputSyncRef.current = true;
        onChange("");
        setInputText("");
      }
      return;
    }

    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    applyValidDate(localDate);
    setIsOpen(false);
  };

  const handleInputChange = (
    event?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    if (event && "target" in event && event.target instanceof HTMLInputElement) {
      setInputText(event.target.value);
      if (displayError) reportValidation(null);
    }
  };

  const handleInputBlur = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      if (required) {
        reportValidation("Date of birth is required.");
      } else {
        reportValidation(null);
        skipInputSyncRef.current = true;
        onChange("");
      }
      return;
    }

    const result = validateDobInput(trimmed, bounds, {
      required: true,
      minAge: variant === "child" ? 0 : minAge,
      maxAge,
    });

    if (!result.valid) {
      reportValidation(result.message);
      return;
    }

    reportValidation(null);
    skipInputSyncRef.current = true;
    onChange(result.iso);
    setInputText(formatDobDisplay(result.iso));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const describedBy = [
    ariaDescribedBy,
    displayError ? errorId : null,
    required ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const inputClassName = cn(
    "w-full px-4 py-3 pr-11 rounded-xl border bg-white outline-none text-sm transition-all font-medium text-on-surface placeholder:text-on-surface-variant/60",
    "focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
    displayError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-outline-variant"
  );

  if (!isMounted) {
    return (
      <div className={cn("relative w-full", className)}>
        <DatePickerInput
          id={inputId}
          name={name}
          readOnly
          disabled={disabled}
          placeholder={placeholder}
          value={inputText}
          inputClassName={inputClassName}
          aria-describedby={describedBy}
          aria-required={required || undefined}
        />
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <DatePicker
        id={inputId}
        name={name}
        selected={selectedDate}
        onChange={handleCalendarChange}
        open={isOpen}
        onInputClick={() => !disabled && setIsOpen(true)}
        onFocus={() => !disabled && setIsOpen(true)}
        onCalendarOpen={() => setIsOpen(true)}
        onCalendarClose={() => setIsOpen(false)}
        onClickOutside={() => setIsOpen(false)}
        shouldCloseOnSelect
        disabled={disabled}
        required={required}
        minDate={bounds.minDate}
        maxDate={bounds.maxDate}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        scrollableYearDropdown
        yearDropdownItemNumber={variant === "child" ? maxAge + 1 : maxAge + 1}
        dateFormat={DOB_DISPLAY_FORMAT}
        placeholderText={placeholder}
        autoComplete="bday"
        wrapperClassName="momplan-datepicker-wrapper"
        popperClassName="momplan-datepicker-popper"
        popperPlacement="bottom-start"
        calendarStartDay={0}
        value={inputText}
        onChangeRaw={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        ariaInvalid={displayError ? "true" : undefined}
        ariaDescribedBy={describedBy}
        ariaRequired={required ? "true" : undefined}
        customInput={
          <DatePickerInput
            inputClassName={inputClassName}
            onIconClick={() => !disabled && setIsOpen((open) => !open)}
          />
        }
      />

      {required && !displayError && (
        <p id={hintId} className="sr-only">
          Required. Use format {DOB_DISPLAY_FORMAT}. Must be between{" "}
          {formatIsoDateLocal(bounds.minDate)} and {formatIsoDateLocal(bounds.maxDate)}.
        </p>
      )}

      {displayError && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-600 flex items-start gap-1">
          <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {displayError}
        </p>
      )}
    </div>
  );
}
