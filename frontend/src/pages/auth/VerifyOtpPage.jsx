import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi.js";
import AuthLayout from "../../components/layout/AuthLayout.jsx";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const EMPTY_OTP = Array(OTP_LENGTH).fill("");

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(EMPTY_OTP);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const focusAt = (i) => inputs.current[i]?.focus();

  const handleOtpChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < OTP_LENGTH - 1) focusAt(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) focusAt(i - 1);
    if (e.key === "ArrowLeft" && i > 0) focusAt(i - 1);
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) focusAt(i + 1);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || "");
    setOtp(next);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleResend = async () => {
    if (!email) {
      setError("Please specify the email address.");
      return;
    }
    setError("");
    setSuccess("");
    setResending(true);
    try {
      await authApi.sendOtp(email);
      setSuccess(`New OTP sent to ${email}`);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    if (!email) {
      setError("Email address is required");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await authApi.verifyOtp(email, code);
      setSuccess("Email verified successfully! You may now sign in or register.");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit verification code"
      error={error}
      success={success}
      footer={
        <>
          Need to sign in?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
            6-Digit Verification Code
          </label>
          <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || otp.join("").length !== OTP_LENGTH}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            "Verify OTP"
          )}
        </button>

        <div className="flex items-center justify-between text-xs font-medium text-slate-600">
          <Link to="/register" className="hover:text-indigo-600">
            Back to Register
          </Link>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
          >
            {resending
              ? "Sending..."
              : cooldown > 0
              ? `Resend in ${cooldown}s`
              : "Resend Code"}
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
