import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiUser, FiCamera, FiLock, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import UserPageShell from "./UserPageShell.jsx";
import FormField from "../../components/common/FormField.jsx";
import apiClient from "../../api/axios.js";
import { ENDPOINTS } from "../../api/endpoints.js";
import { setUser } from "../../store/slices/authSlice.js";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // Profile form state
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState("");
  const [avatarError, setAvatarError] = useState("");

  // Password change state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Handle Profile Details Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setUpdatingProfile(true);

    try {
      const res = await apiClient.patch(ENDPOINTS.AUTH.UPDATE_ACCOUNT, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
      const updatedUser = res.data?.data || res.data;
      dispatch(setUser({ ...user, ...updatedUser }));
      setProfileSuccess("Profile details updated successfully!");
    } catch (err) {
      setProfileError(
        err.response?.data?.message || "Failed to update profile details."
      );
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle Avatar Image File Upload
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image size must be less than 5MB.");
      return;
    }

    setAvatarError("");
    setAvatarSuccess("");
    setUploadingAvatar(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await apiClient.patch(ENDPOINTS.AUTH.UPDATE_AVATAR, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedData = res.data?.data || res.data;
      const avatarUrl = updatedData?.avatar || updatedData?.url || URL.createObjectURL(file);
      dispatch(setUser({ ...user, avatar: avatarUrl }));
      setAvatarSuccess("Avatar updated successfully!");
    } catch (err) {
      setAvatarError(
        err.response?.data?.message || "Failed to upload avatar image."
      );
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!oldPassword || !newPassword) {
      setPasswordError("Both current and new passwords are required.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);

    try {
      await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        oldPassword,
        newPassword,
      });
      setPasswordSuccess("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || "Failed to change password. Please check your old password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <UserPageShell
      title="Account Settings"
      subtitle="Manage your personal profile, contact information, and security preferences"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ================= LEFT COLUMN: AVATAR & OVERVIEW ================= */}
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullName}
                className="h-28 w-28 rounded-full border-4 border-indigo-100 object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-indigo-100 bg-indigo-50 text-4xl font-bold text-indigo-600 shadow-sm">
                {user?.fullName?.charAt(0)?.toUpperCase() || <FiUser />}
              </div>
            )}

            <label
              htmlFor="avatar-upload"
              className="absolute bottom-1 right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700"
              title="Change photo"
            >
              <FiCamera className="text-sm" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900">{user?.fullName}</h3>
          <p className="text-xs text-slate-500">@{user?.username || "user"}</p>
          <p className="text-sm text-slate-600 mt-1">{user?.email}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">
              Role: {user?.role || "user"}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Active Member
            </span>
          </div>

          {uploadingAvatar && (
            <p className="mt-3 text-xs font-medium text-indigo-600 animate-pulse">
              Uploading avatar...
            </p>
          )}
          {avatarSuccess && (
            <p className="mt-3 text-xs font-medium text-emerald-600">{avatarSuccess}</p>
          )}
          {avatarError && (
            <p className="mt-3 text-xs font-medium text-rose-500">{avatarError}</p>
          )}
        </div>

        {/* ================= RIGHT COLUMN: EDIT DETAILS & PASSWORD ================= */}
        <div className="space-y-8 lg:col-span-2">
          {/* PROFILE FORM */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">Personal Details</h2>

            {profileSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <FiCheckCircle />
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <FiAlertCircle />
                {profileError}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
                <FormField
                  label="Mobile Number"
                  type="tel"
                  leftAddon="+91"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                />
                <span className="mt-1 block text-[11px] text-slate-400">
                  Email address is verified and permanently linked to your account.
                </span>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  About / Bio
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself or special service instructions..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updatingProfile ? "Saving changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>

          {/* CHANGE PASSWORD FORM */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FiLock className="text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Change Password</h2>
            </div>

            {passwordSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <FiCheckCircle />
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <FiAlertCircle />
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <FormField
                label="Current Password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                required
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                />
                <FormField
                  label="Confirm New Password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {changingPassword ? "Updating password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </UserPageShell>
  );
}
