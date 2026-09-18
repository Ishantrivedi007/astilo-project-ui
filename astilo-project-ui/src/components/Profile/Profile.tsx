import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Chip } from "@heroui/react";
import {
  Home,
  Clapperboard,
  Music,
  Sparkles,
  ShoppingBag,
  Palette,
  ShieldCheck,
} from "lucide-react";
import AppLoader from "../SharedComponents/Loader/AppLoader";
import { PageHeading, GlassPanel, AppInput, AppTextarea } from "../shared";
import { useAuth } from "../../auth/AuthProvider";
import type { AuthUser } from "../../auth/authApi";
import {
  fetchMe,
  updateProfile,
  changePassword,
  fetchSessions,
  profileErrorMessage,
} from "../../lib/profileApi";
import { resizeImageToDataUrl } from "../../lib/imageResize";
import { summarizeUserAgent } from "../../lib/userAgent";

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "—";

const GENDERS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "other", label: "Other" },
];

interface DetailsForm {
  name: string;
  bio: string;
  phone: string;
  location: string;
  dateOfBirth: string;
  gender: string;
  website: string;
}

const toForm = (u: AuthUser | undefined): DetailsForm => ({
  name: u?.name ?? "",
  bio: u?.bio ?? "",
  phone: u?.phone ?? "",
  location: u?.location ?? "",
  dateOfBirth: u?.dateOfBirth ?? "",
  gender: u?.gender ?? "",
  website: u?.website ?? "",
});

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">{label}</p>
    <p className="mt-0.5 text-sm text-ink/80">{value || "—"}</p>
  </div>
);

const timeAgo = (iso: string | null) => {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

/** Pages/features available per role — mirrors the sidebar's own nav list. */
const ACCESS_ITEMS = [
  { label: "Home", icon: Home, roles: ["user", "admin"], desc: "Personal dashboard" },
  { label: "Movies & TV", icon: Clapperboard, roles: ["user", "admin"], desc: "Browse, watch, watchlist" },
  { label: "Anime", icon: Sparkles, roles: ["user", "admin"], desc: "Browse, watch, watchlist" },
  { label: "Music", icon: Music, roles: ["user", "admin"], desc: "Player, playlists, downloads" },
  { label: "Store", icon: ShoppingBag, roles: ["user", "admin"], desc: "Shop, cart, orders, tracking" },
  { label: "Customize", icon: Palette, roles: ["user", "admin"], desc: "Themes & appearance" },
  { label: "Admin panel", icon: ShieldCheck, roles: ["admin"], desc: "Users, products & orders management" },
];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: me, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    initialData: user ?? undefined,
  });

  const { data: sessions } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: fetchSessions,
  });
  const activeSessionCount = sessions?.filter((s) => s.isActive).length ?? 0;

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<DetailsForm>(toForm(me));

  useEffect(() => {
    if (!isEditing) setForm(toForm(me));
  }, [me, isEditing]);

  const applyResult = (next: AuthUser) => {
    queryClient.setQueryData(["me"], next);
    updateUser(next);
  };

  const saveDetails = useMutation({
    mutationFn: () => updateProfile(form),
    onSuccess: (next) => {
      applyResult(next);
      setIsEditing(false);
      toast.success("Profile updated.");
    },
    onError: (err: unknown) => toast.error(profileErrorMessage(err, "Couldn't save your profile.")),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await resizeImageToDataUrl(file);
      return updateProfile({ avatar: dataUrl });
    },
    onSuccess: (next) => {
      applyResult(next);
      toast.success("Profile photo updated.");
    },
    onError: (err: unknown) => toast.error(profileErrorMessage(err, "Couldn't update your photo.")),
  });

  const removeAvatar = useMutation({
    mutationFn: () => updateProfile({ avatar: null }),
    onSuccess: (next) => {
      applyResult(next);
      toast.success("Profile photo removed.");
    },
    onError: (err: unknown) => toast.error(profileErrorMessage(err, "Couldn't remove your photo.")),
  });

  const [showSecurity, setShowSecurity] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const savePassword = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowSecurity(false);
      toast.success("Password changed.");
    },
    onError: (err: unknown) => toast.error(profileErrorMessage(err, "Couldn't change your password.")),
  });

  if (isLoading && !me)
    return (
      <div className="flex justify-center py-32">
        <AppLoader label="loading profile…" />
      </div>
    );

  const set = (key: keyof DetailsForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const genderLabel = GENDERS.find((g) => g.value === (me?.gender ?? ""))?.label ?? "—";

  return (
    <section className="mx-auto max-w-4xl pb-16">
      <PageHeading eyebrow="✦ your account">
        My <span className="gradient-text">profile</span>
      </PageHeading>

      {/* Header card */}
      <div className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -inset-x-10 -top-24 h-40 rotate-[10deg] bg-gradient-to-b from-accent/10 to-transparent blur-2xl" />
        <div className="relative flex items-center gap-5">
          <div className="group relative h-24 w-24 shrink-0">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-hair/20 bg-gradient-to-br from-accent/40 to-accent-2/40 text-2xl font-bold text-ink shadow-lg">
              {me?.avatar ? (
                <img src={me.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(me?.name ?? "?")
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              title="Change photo"
              aria-label="Change photo"
              className="absolute inset-0 grid place-items-center rounded-full bg-black/0 text-white opacity-0 transition-opacity group-hover:bg-black/50 group-hover:opacity-100"
            >
              {uploadAvatar.isPending ? "…" : "📷"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) uploadAvatar.mutate(file);
              }}
            />
            {me?.avatar && (
              <button
                type="button"
                onClick={() => removeAvatar.mutate()}
                disabled={removeAvatar.isPending}
                title="Remove photo"
                aria-label="Remove photo"
                className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-danger text-xs text-white shadow ring-2 ring-[rgb(var(--surface-rgb))]"
              >
                ✕
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 leading-none">
              <h1 className="font-display text-2xl font-extrabold leading-none text-ink">{me?.name}</h1>
              <Chip
                size="sm"
                className={`text-xs font-semibold capitalize ${
                  me?.role === "admin" ? "bg-accent/20 text-accent-2" : "bg-ink/10 text-ink/70"
                }`}
              >
                {me?.role}
              </Chip>
            </div>
            <p className="mt-1.5 text-sm text-ink/60">{me?.email}</p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap gap-2 border-t border-hair/15 pt-4">
          <Chip size="sm" className="bg-ink/10 text-xs font-medium text-ink/70">
            📅 Member since {fmtDate(me?.createdAt)}
          </Chip>
          <Chip size="sm" className="bg-ink/10 text-xs font-medium text-ink/70">
            🌐 {activeSessionCount} active session{activeSessionCount === 1 ? "" : "s"}
          </Chip>
          <Chip size="sm" className="bg-ink/10 text-xs font-medium text-ink/70">
            {me?.role === "admin" ? "🛡️ Full admin access" : "👤 Standard access"}
          </Chip>
        </div>
      </div>

      {/* Personal details */}
      <GlassPanel
        className="mt-6"
        title="Personal details"
        subtitle="Tell us a bit more about yourself"
        action={
          isEditing ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                radius="full"
                variant="bordered"
                className="border-hair/40 font-semibold text-ink"
                onPress={() => {
                  setForm(toForm(me));
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                radius="full"
                isDisabled={saveDetails.isPending}
                className="bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f]"
                onPress={() => saveDetails.mutate()}
              >
                {saveDetails.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              radius="full"
              variant="bordered"
              className="border-hair/40 font-semibold text-ink"
              onPress={() => setIsEditing(true)}
            >
              ✎ Edit
            </Button>
          )
        }
      >
        {isEditing ? (
          <div className="flex flex-col gap-4">
            <AppInput label="Full name" value={form.name} onValueChange={set("name")} isRequired />
            <AppTextarea
              label="Bio"
              value={form.bio}
              onValueChange={set("bio")}
              minRows={3}
              placeholder="A short bio about you…"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AppInput label="Phone number" value={form.phone} onValueChange={set("phone")} />
              <AppInput label="Location" value={form.location} onValueChange={set("location")} placeholder="City, Country" />
              <AppInput
                label="Date of birth"
                type="date"
                value={form.dateOfBirth}
                onValueChange={set("dateOfBirth")}
              />
              <div className="app-input">
                <label className="app-input-label">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender")(e.target.value)}
                  className="app-input-wrapper app-input-field w-full bg-transparent"
                >
                  {GENDERS.map((g) => (
                    <option key={g.value} value={g.value} className="bg-surface text-ink">
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <AppInput label="Website" value={form.website} onValueChange={set("website")} placeholder="https://…" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <DetailRow label="Bio" value={me?.bio ?? ""} />
            </div>
            <DetailRow label="Phone" value={me?.phone ?? ""} />
            <DetailRow label="Location" value={me?.location ?? ""} />
            <DetailRow label="Date of birth" value={fmtDate(me?.dateOfBirth)} />
            <DetailRow label="Gender" value={genderLabel} />
            <div className="sm:col-span-2">
              <DetailRow label="Website" value={me?.website ?? ""} />
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Access & permissions */}
      <GlassPanel className="mt-6" title="Access & permissions" subtitle="Pages and features your account can reach">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ACCESS_ITEMS.map((item) => {
            const allowed = item.roles.includes(me?.role ?? "user");
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  allowed ? "border-hair/15 bg-ink/[0.03]" : "border-hair/10 opacity-40"
                }`}
              >
                <div
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                    allowed ? "bg-gradient-to-br from-accent/30 to-accent-2/30 text-ink" : "bg-ink/10 text-ink/40"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="text-xs text-ink/50">{item.desc}</p>
                </div>
                <span className={`text-xs font-bold ${allowed ? "text-emerald-500" : "text-ink/30"}`}>
                  {allowed ? "✓" : "✕"}
                </span>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* Sign-in history */}
      <GlassPanel className="mt-6" title="Sign-in history" subtitle="Recent logins to your account, by device and IP">
        {!sessions ? (
          <div className="flex justify-center py-8">
            <AppLoader label="loading…" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/50">No sign-ins recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((s) => {
              const { browser, os, icon } = summarizeUserAgent(s.userAgent);
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hair/15 bg-ink/[0.03] p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden>
                      {icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {browser} on {os}
                      </p>
                      <p className="text-xs text-ink/50">
                        {s.ipAddress ?? "Unknown IP"} · {timeAgo(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Chip
                    size="sm"
                    className={`text-xs font-semibold ${
                      s.isActive ? "bg-emerald-500/15 text-emerald-500" : "bg-ink/10 text-ink/40"
                    }`}
                  >
                    {s.isActive ? "● Active" : "Expired"}
                  </Chip>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-[11px] text-ink/35">
          "Active" means the sign-in's session token hasn't expired yet — there's no remote log-out for
          individual devices since sessions aren't tracked server-side beyond this history.
        </p>
      </GlassPanel>

      {/* Security */}
      <GlassPanel
        className="mt-6"
        title="Account security"
        subtitle="Change your password"
        action={
          !showSecurity && (
            <Button
              size="sm"
              radius="full"
              variant="bordered"
              className="border-hair/40 font-semibold text-ink"
              onPress={() => setShowSecurity(true)}
            >
              🔒 Change password
            </Button>
          )
        }
      >
        {showSecurity && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (newPassword.length < 6) {
                toast.error("New password must be at least 6 characters.");
                return;
              }
              if (newPassword !== confirmPassword) {
                toast.error("New passwords don't match.");
                return;
              }
              savePassword.mutate();
            }}
          >
            <AppInput
              label="Current password"
              type="password"
              value={currentPassword}
              onValueChange={setCurrentPassword}
              isRequired
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AppInput
                label="New password"
                type="password"
                value={newPassword}
                onValueChange={setNewPassword}
                isRequired
              />
              <AppInput
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                isRequired
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                radius="full"
                variant="bordered"
                className="border-hair/40 font-semibold text-ink"
                onPress={() => {
                  setShowSecurity(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                radius="full"
                isDisabled={savePassword.isPending}
                className="bg-gradient-to-r from-accent to-accent-2 font-bold text-[#17131f]"
              >
                {savePassword.isPending ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        )}
      </GlassPanel>
    </section>
  );
};

export default Profile;
