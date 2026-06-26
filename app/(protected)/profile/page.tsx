"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { authFetch } from "@/lib/TanStackQuery/authQueries/authFetch";
import { queryClient } from "@/lib/TanStackQuery/queryClient";
import { uploadImage } from "@/lib/firebase/uploadImage";
import BackButton from "@/components/basics/BackButton";
import { IconX, IconCamera, IconCheck, IconEye, IconEyeOff } from "@tabler/icons-react";

type Modal = "edit" | "password" | null;

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const close = () => setActiveModal(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-sm text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-sm text-muted-foreground">
        You are not logged in.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center overflow-x-hidden px-4 py-10">

      {/* Header row */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your account</p>
        </div>
        <BackButton />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl"
      >
        <Card className="rounded-2xl shadow-md">
          <CardContent className="p-6 sm:p-8 space-y-8">

            {/* Avatar + name */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6">
              <Avatar className="h-24 w-24 flex-shrink-0">
                <AvatarImage src={user?.profileImageUrl ?? undefined} />
                <AvatarFallback className="text-xl">
                  {(user?.username?.slice(0, 2) || user?.email?.slice(0, 2) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1 text-center sm:text-left">
                <h1 className="text-2xl font-semibold">{user?.username ?? "User"}</h1>
                <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Member since{" "}
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoItem label="Username" value={user?.username ?? "—"} />
              <InfoItem label="Email"    value={user?.email    ?? "—"} />
              <InfoItem label="Role"     value={user?.role     ?? "—"} />
              <InfoItem label="User ID"  value={user?._id      ?? "—"} />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setActiveModal("edit")}>
                Edit Profile
              </Button>
              <Button onClick={() => setActiveModal("password")}>
                Change Password
              </Button>
            </div>

          </CardContent>
        </Card>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "edit" && (
          <EditProfileModal user={user} onClose={close} />
        )}
        {activeModal === "password" && (
          <ChangePasswordModal onClose={close} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   Edit Profile Modal
───────────────────────────────────────── */
function EditProfileModal({ user, onClose }: { user: any; onClose: () => void }) {
  const [username, setUsername] = useState(user.username ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(user.profileImageUrl ?? null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    setError("");
    if (!username.trim()) { setError("Username is required"); return; }

    setLoading(true);
    try {
      let profileImageUrl = user.profileImageUrl;
      if (imageFile) profileImageUrl = await uploadImage(imageFile);

      const res = await authFetch("/api/user/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), profileImageUrl }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to update profile"); return; }

      queryClient.setQueryData(["current-user"], data.user);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Edit Profile">
      {/* Avatar picker */}
      <div className="flex justify-center">
        <label className="relative cursor-pointer group">
          <Avatar className="h-20 w-20">
            <AvatarImage src={preview ?? undefined} />
            <AvatarFallback className="text-lg">
              {(username?.slice(0, 2) || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center
            justify-center opacity-0 group-hover:opacity-100 transition">
            <IconCamera className="w-5 h-5 text-white" />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Username</Label>
        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter new username"
          className="bg-neutral-900/60 border-neutral-700 rounded-xl"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email</Label>
        <Input
          value={user.email}
          disabled
          className="bg-neutral-900/40 border-neutral-800 rounded-xl opacity-50 cursor-not-allowed"
        />
        <p className="text-[10px] text-muted-foreground">Email cannot be changed here</p>
      </div>

      {error   && <p className="text-sm text-red-400 text-center">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-400 text-center flex items-center justify-center gap-1">
          <IconCheck className="w-4 h-4" /> Saved!
        </p>
      )}

      <Button onClick={handleSubmit} disabled={loading || success} className="w-full rounded-xl">
        {loading ? "Saving…" : "Save Changes"}
      </Button>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────
   Change Password Modal
───────────────────────────────────────── */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!current || !next || !confirm) { setError("All fields are required"); return; }
    if (next !== confirm)              { setError("New passwords do not match"); return; }
    if (next.length < 6)               { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const res = await authFetch("/api/user/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to change password"); return; }

      setSuccess(true);
      setTimeout(onClose, 1400);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const eyeBtn = (
    <button
      type="button"
      onClick={() => setShow(s => !s)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
    >
      {show ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
    </button>
  );

  return (
    <ModalShell onClose={onClose} title="Change Password">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Current password</Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            className="bg-neutral-900/60 border-neutral-700 rounded-xl pr-10"
          />
          {eyeBtn}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">New password</Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={next}
            onChange={e => setNext(e.target.value)}
            className="bg-neutral-900/60 border-neutral-700 rounded-xl pr-10"
          />
          {eyeBtn}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Confirm new password</Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="bg-neutral-900/60 border-neutral-700 rounded-xl pr-10"
          />
          {eyeBtn}
        </div>
      </div>

      {error   && <p className="text-sm text-red-400 text-center">{error}</p>}
      {success && (
        <p className="text-sm text-emerald-400 text-center flex items-center justify-center gap-1">
          <IconCheck className="w-4 h-4" /> Password updated!
        </p>
      )}

      <Button onClick={handleSubmit} disabled={loading || success} className="w-full rounded-xl">
        {loading ? "Updating…" : "Update Password"}
      </Button>
    </ModalShell>
  );
}

/* ─────────────────────────────────────────
   Shared modal shell
───────────────────────────────────────── */
function ModalShell({ onClose, title, children }: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
        bg-black/60 backdrop-blur-sm px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl
          shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-neutral-800 transition">
            <IconX className="w-4 h-4 text-neutral-400" />
          </button>
        </div>

        {children}
      </motion.div>
    </motion.div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}