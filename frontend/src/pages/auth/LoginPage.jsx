import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch } from "react-redux";

import AuthLayout from "../../components/layout/AuthLayout.jsx";
import FormField from "../../components/common/FormField.jsx";
import { loginUser } from "../../store/slices/authSlice.js";

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

const PRIMARY_BTN =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none";

const getHomeByRole = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "provider") return "/provider/dashboard";
  return "/";
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values) => {
    setError("");
    setSuccess("");

    try {
      const resultAction = await dispatch(
        loginUser({
          identifier: values.identifier,
          password: values.password,
        })
      );

      if (loginUser.fulfilled.match(resultAction)) {
        const user = resultAction.payload;
        setSuccess("Login successful! Redirecting...");

        // If redirected from ProtectedRoute, send back to intended page
        const from = location.state?.from?.pathname;
        setTimeout(() => {
          navigate(from || getHomeByRole(user?.role), { replace: true });
        }, 500);
      } else {
        setError(
          resultAction.payload ||
            "Invalid credentials. Please check your username/email and password."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Login to book and track your services"
      error={error}
      success={success}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          label="Email or Username"
          type="text"
          placeholder="you@example.com or username"
          autoComplete="username"
          error={errors.identifier?.message}
          {...register("identifier")}
        />

        <FormField
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <button
          type="submit"
          className={PRIMARY_BTN}
          disabled={isSubmitting || !!success}
        >
          {isSubmitting ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            "Login"
          )}
        </button>
      </form>
    </AuthLayout>
  );
}