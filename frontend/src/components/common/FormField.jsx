import { forwardRef, useId, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const FormField = forwardRef(function FormField(
  { label, type = "text", error, leftAddon, className = "", ...rest },
  ref
) {
  const id = useId();
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div
        className={`flex items-center rounded-xl border bg-white transition focus-within:ring-2 ${
          error
            ? "border-rose-400 focus-within:ring-rose-100"
            : "border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-100"
        }`}
      >
        {leftAddon && (
          <span className="border-r border-slate-200 px-3 text-sm font-medium text-slate-500">
            {leftAddon}
          </span>
        )}

        <input
          id={id}
          ref={ref}
          type={inputType}
          aria-invalid={!!error}
          className="w-full min-w-0 rounded-xl bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-60"
          {...rest}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="px-3 text-slate-400 transition hover:text-slate-600"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
});

export default FormField;