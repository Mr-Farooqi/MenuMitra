"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Store,
  Users,
  Lock,
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Shield,
  KeyRound,
  XCircle,
} from "lucide-react";

interface RestaurantProfile {
  id: string;
  name: string;
  slug: string;
  logo: string;
  cover: string;
  address: string;
  city: string;
  phone: string;
  timings: string;
  googleReviewLink: string;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "staff" | "security">("profile");
  const [loading, setLoading] = useState(true);

  // Profile State
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Staff State
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "" });
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffMsg, setStaffMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [profRes, staffRes] = await Promise.all([
        fetch("/api/settings/profile"),
        fetch("/api/settings/staff"),
      ]);

      if (profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData.restaurant);
      }
      if (staffRes.ok) {
        const sData = await staffRes.json();
        setStaffList(sData.staff || []);
      }
    } catch (err) {
      console.error("Failed to load settings data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Image Upload (Logo / Cover)
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>, field: "logo" | "cover") {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setProfile({ ...profile, [field]: data.url });
      } else {
        alert(data.error || "Image upload failed");
      }
    } catch {
      alert("Error uploading image");
    }
  }

  // Save Profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();

      if (res.ok) {
        setProfileMsg({ type: "success", text: "Restaurant profile updated successfully!" });
        setTimeout(() => setProfileMsg(null), 4000);
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error updating profile" });
    } finally {
      setSavingProfile(false);
    }
  }

  // Create Staff
  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setAddingStaff(true);
    setStaffMsg(null);

    try {
      const res = await fetch("/api/settings/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff),
      });
      const data = await res.json();

      if (res.ok) {
        setStaffList([data.staff, ...staffList]);
        setIsStaffModalOpen(false);
        setNewStaff({ name: "", email: "", password: "" });
        setStaffMsg({ type: "success", text: `Staff member ${data.staff.name} added successfully!` });
        setTimeout(() => setStaffMsg(null), 4000);
      } else {
        setStaffMsg({ type: "error", text: data.error || "Failed to add staff" });
      }
    } catch {
      setStaffMsg({ type: "error", text: "Network error adding staff" });
    } finally {
      setAddingStaff(false);
    }
  }

  // Delete Staff
  async function handleDeleteStaff(id: string) {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      const res = await fetch(`/api/settings/staff?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setStaffList(staffList.filter((s) => s.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete staff");
      }
    } catch {
      alert("Network error deleting staff");
    }
  }

  // Change Password
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New password and confirmation do not match" });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg(null);

    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordMsg(null), 4000);
      } else {
        setPasswordMsg({ type: "error", text: data.error || "Failed to update password" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Network error updating password" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl shadow-md">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Restaurant & Account Settings
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure your restaurant profile details, manage staff accounts, and update credentials.
          </p>
        </div>

        {profile && (
          <a
            href={`/m/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
            View Public Menu
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
            activeTab === "profile"
              ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Store className="w-4 h-4" />
          Restaurant Profile
        </button>

        <button
          onClick={() => setActiveTab("staff")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
            activeTab === "staff"
              ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Accounts
          <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-700 rounded-full">
            {staffList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition flex items-center gap-2 ${
            activeTab === "security"
              ? "bg-white border-t-2 border-l border-r border-amber-500 text-amber-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          Password & Security
        </button>
      </div>

      {/* ================= TAB 1: RESTAURANT PROFILE ================= */}
      {activeTab === "profile" && profile && (
        <form onSubmit={handleSaveProfile} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
          {profileMsg && (
            <div
              className={`p-4 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                profileMsg.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {profileMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          {/* Images Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
            {/* Logo */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Restaurant Logo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                  {profile.logo ? (
                    <img src={profile.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 shadow-sm transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "logo")}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">Square PNG/JPG, max 5MB</p>
                </div>
              </div>
            </div>

            {/* Cover */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Cover Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center shrink-0">
                  {profile.cover ? (
                    <img src={profile.cover} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl text-xs font-semibold text-gray-700 shadow-sm transition">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Cover
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "cover")}
                    />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">Wide 16:9 banner image</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Restaurant Name</label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Public URL Slug</label>
              <input
                type="text"
                disabled
                value={profile.slug}
                className="w-full text-xs px-3 py-2.5 border border-gray-200 bg-gray-50 text-gray-500 rounded-xl cursor-not-allowed font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={profile.phone || ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={profile.city || ""}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="e.g. Mumbai, Delhi, Bengaluru"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Full Street Address</label>
              <input
                type="text"
                value={profile.address || ""}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Shop 12, Ground Floor, High Street, Near Central Station"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Operating Timings</label>
              <input
                type="text"
                value={profile.timings || ""}
                onChange={(e) => setProfile({ ...profile, timings: e.target.value })}
                placeholder="11:00 AM - 11:30 PM (Daily)"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Google Maps Review Link</label>
              <input
                type="url"
                value={profile.googleReviewLink || ""}
                onChange={(e) => setProfile({ ...profile, googleReviewLink: e.target.value })}
                placeholder="https://g.page/r/YOUR_RESTAURANT_ID/review"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
            >
              {savingProfile ? "Saving Changes..." : "Save Restaurant Profile"}
            </button>
          </div>
        </form>
      )}

      {/* ================= TAB 2: STAFF ACCOUNTS ================= */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Restaurant Staff & Crew</h3>
              <p className="text-xs text-gray-500">
                Staff accounts have access to live kitchen orders and the POS coupon redemption counter.
              </p>
            </div>

            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Staff Account
            </button>
          </div>

          {staffMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                staffMsg.type === "success"
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{staffMsg.text}</span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-amber-50/50 text-xs text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffList.map((user) => (
                  <tr key={user.id} className="hover:bg-amber-50/20 transition">
                    <td className="px-6 py-4 font-bold text-gray-900 text-xs flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                        {user.name.charAt(0)}
                      </div>
                      {user.name}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          user.role === "OWNER"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role === "STAFF" && (
                        <button
                          onClick={() => handleDeleteStaff(user.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition"
                          title="Remove staff member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Staff Modal */}
          {isStaffModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form
                onSubmit={handleCreateStaff}
                className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900">Add Staff Account</h3>
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Login</label>
                  <input
                    type="email"
                    required
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    placeholder="ramesh@tandoorinights.com"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingStaff}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                  >
                    {addingStaff ? "Creating..." : "Create Staff Member"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: PASSWORD & SECURITY ================= */}
      {activeTab === "security" && (
        <div className="max-w-md mx-auto">
          <form
            onSubmit={handleChangePassword}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4"
          >
            <div className="pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Change Account Password</h3>
              <p className="text-xs text-gray-500">
                Update your login password securely using your current password.
              </p>
            </div>

            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  passwordMsg.type === "success"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {passwordMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full text-xs px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
