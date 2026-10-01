import { Fragment, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FiCheck } from "react-icons/fi";
import { useDispatch } from "react-redux";

import AuthLayout from "../../components/layout/AuthLayout.jsx";
import FormField from "../../components/common/FormField.jsx";
import { authApi } from "../../api/authApi.js";
import { registerUser } from "../../store/slices/authSlice.js";

const STEPS = ["Email", "Verify", "Details"];
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const EMPTY_OTP = Array(OTP_LENGTH).fill("");

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

const detailsSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(60, "Too long"),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(20, "Too long")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Letters, numbers, and underscore only"
      )
      .toLowerCase(),
    phone: z
      .string()
      .min(1, "Mobile number is required")
      .transform((val) => val.replace(/\D/g, "").slice(-10))
      .refine((val) => /^[6-9]\d{9}$/.test(val), {
        message: "Enter a valid 10-digit mobile number starting with 6-9",
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/\d/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const PRIMARY_BTN =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none";
const SECONDARY_BTN =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function Spinner() {
  return (
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

/* ----------------------------- Step indicator ----------------------------- */
function StepIndicator({ current }) {
  return (
    <div className="mb-6 flex items-center">
      {STEPS.map((label, idx) => {
        const n = idx + 1;
        const done = n < current;
        const active = n === current;

        return (
          <Fragment key={label}>
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-indigo-600 text-white"
                    : active
                    ? "border-2 border-indigo-600 bg-indigo-50 text-indigo-700"
                    : "border border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                {done ? <FiCheck /> : n}
              </span>
              <span
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wide ${
                  done || active ? "text-slate-700" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-2 mb-4 h-px flex-1 ${
                  done ? "bg-indigo-600" : "bg-slate-200"
                }`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* -------------------------------- OTP input ------------------------------- */
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const focusAt = (i) => inputs.current[i]?.focus();

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < OTP_LENGTH - 1) focusAt(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !value[i] && i > 0) focusAt(i - 1);
    if (e.key === "ArrowLeft" && i > 0) focusAt(i - 1);
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) focusAt(i + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array.from(
      { length: OTP_LENGTH },
      (_, i) => pasted[i] || ""
    );
    onChange(next);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  return (
    <div className="flex justify-between gap-2" onPaste={handlePaste}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-full rounded-xl border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
        />
      ))}
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */
export default function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const detailsForm = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      fullName: "",
      username: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  // Resend countdown
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  /* ---------------------------- Step 1: send OTP --------------------------- */
  const sendOtp = async (targetEmail) => {
    setError("");
    setSuccess("");
    setSending(true);

    try {
      await authApi.sendOtp(targetEmail);
      setEmail(targetEmail);
      setOtp(EMPTY_OTP);
      setOtpCooldown(RESEND_SECONDS);
      setSuccess(`Verification code sent to ${targetEmail}`);
      setStep(2);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send verification code. Please retry."
      );
    } finally {
      setSending(false);
    }
  };

  /* --------------------------- Step 2: verify OTP -------------------------- */
  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError("");
    setSuccess("");
    setVerifying(true);

    try {
      await authApi.verifyOtp(email, code);
      // Clear success message so it does not disable the Step 3 button
      setSuccess("");
      setError("");
      setStep(3);
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid or expired verification code."
      );
    } finally {
      setVerifying(false);
    }
  };

  /* ------------------------- Step 3: create account ------------------------ */
  const onRegister = async (values) => {
    setError("");
    setSuccess("");

    const code = otp.join("");
    const { confirmPassword, ...payload } = values;
    void confirmPassword;

    try {
      const resultAction = await dispatch(
        registerUser({
          ...payload,
          email,
          otp: code,
        })
      );

      if (registerUser.fulfilled.match(resultAction)) {
        setRegistered(true);
        setSuccess("Account created successfully! Welcome aboard.");
        setTimeout(() => navigate("/", { replace: true }), 1200);
      } else {
        const errorMsg =
          resultAction.payload ||
          "Failed to complete registration. Please verify all fields.";
        setError(errorMsg);

        // Highlight the specific conflicting field if returned by backend
        if (typeof errorMsg === "string") {
          const lower = errorMsg.toLowerCase();
          if (lower.includes("username")) {
            detailsForm.setError("username", {
              type: "server",
              message: errorMsg,
            });
          } else if (lower.includes("phone")) {
            detailsForm.setError("phone", {
              type: "server",
              message: errorMsg,
            });
          } else if (lower.includes("email")) {
            detailsForm.setError("email", {
              type: "server",
              message: errorMsg,
            });
          }
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  const onInvalid = (validationErrors) => {
    console.warn("Validation errors in registration form:", validationErrors);
    setError("Please fix the highlighted fields above before submitting.");
  };

  const subtitles = {
    1: "Enter your email to receive a verification code",
    2: "Enter the 6-digit code sent to your inbox",
    3: "Complete your profile to finish setup",
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={subtitles[step]}
      error={error}
      success={success}
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Login
          </Link>
        </>
      }
    >
      <StepIndicator current={step} />

      {/* ============================ STEP 1 ============================ */}
      {step === 1 && (
        <form
          onSubmit={emailForm.handleSubmit(({ email: value }) => sendOtp(value))}
          noValidate
          className="space-y-4"
        >
          <FormField
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            disabled={sending}
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register("email")}
          />

          <button type="submit" className={PRIMARY_BTN} disabled={sending}>
            {sending ? <Spinner /> : "Send Verification Code"}
          </button>
        </form>
      )}

      {/* ============================ STEP 2 ============================ */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-center text-sm text-slate-600">
            Verification code sent to{" "}
            <span className="font-semibold text-slate-900">{email}</span>
          </p>

          <OtpInput value={otp} onChange={setOtp} disabled={verifying} />

          <button
            type="button"
            onClick={handleVerifyOtp}
            className={PRIMARY_BTN}
            disabled={otp.join("").length !== OTP_LENGTH || verifying}
          >
            {verifying ? <Spinner /> : "Verify Code & Proceed"}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              className={SECONDARY_BTN}
              disabled={verifying}
              onClick={() => {
                setError("");
                setSuccess("");
                setStep(1);
              }}
            >
              Change email
            </button>
            <button
              type="button"
              className={SECONDARY_BTN}
              disabled={otpCooldown > 0 || sending || verifying}
              onClick={() => sendOtp(email)}
            >
              {sending
                ? "Sending..."
                : otpCooldown > 0
                ? `Resend in ${otpCooldown}s`
                : "Resend Code"}
            </button>
          </div>
        </div>
      )}

      {/* ============================ STEP 3 ============================ */}
      {step === 3 && (
        <form
          onSubmit={detailsForm.handleSubmit(onRegister, onInvalid)}
          noValidate
          className="space-y-4"
        >
          <div className="relative">
            <FormField
              label="Email"
              type="email"
              value={email}
              disabled
              readOnly
            />
            <span className="absolute right-3 top-8 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <FiCheck className="text-emerald-600" />
              Verified
            </span>
          </div>

          <FormField
            label="Full name"
            placeholder="e.g. Rahul Sharma"
            autoComplete="name"
            error={detailsForm.formState.errors.fullName?.message}
            {...detailsForm.register("fullName")}
          />

          <FormField
            label="Username"
            placeholder="e.g. rahul_sharma"
            autoComplete="username"
            error={detailsForm.formState.errors.username?.message}
            {...detailsForm.register("username")}
          />

          <FormField
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            maxLength={10}
            leftAddon="+91"
            placeholder="9876543210"
            autoComplete="tel-national"
            error={detailsForm.formState.errors.phone?.message}
            {...detailsForm.register("phone")}
          />

          <FormField
            label="Password"
            type="password"
            placeholder="Min 8 characters (at least 1 letter, 1 number)"
            autoComplete="new-password"
            error={detailsForm.formState.errors.password?.message}
            {...detailsForm.register("password")}
          />

          <FormField
            label="Confirm password"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            error={detailsForm.formState.errors.confirmPassword?.message}
            {...detailsForm.register("confirmPassword")}
          />

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 shadow-xs">
              <p className="font-semibold">{error}</p>
              {error.toLowerCase().includes("already exists") && (
                <Link
                  to="/login"
                  className="mt-2 inline-flex items-center gap-1 font-bold text-indigo-700 underline hover:text-indigo-900"
                >
                  Click here to Log In instead &rarr;
                </Link>
              )}
            </div>
          )}

          <button
            type="submit"
            className={PRIMARY_BTN}
            disabled={detailsForm.formState.isSubmitting || registered}
          >
            {detailsForm.formState.isSubmitting ? (
              <Spinner />
            ) : registered ? (
              "Account Created! Redirecting..."
            ) : (
              "Complete & Create Account"
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}