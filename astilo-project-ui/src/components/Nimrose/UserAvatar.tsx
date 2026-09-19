const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

/** A small circular avatar — the user's real profile photo when they have
 * one, initials otherwise. Used to connect ticket assignees to actual
 * Astilo user profiles instead of a bare letter. */
const UserAvatar = ({ name, avatarUrl, size = 22 }: Props) => {
  const style = { width: size, height: size, fontSize: size * 0.4 };
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className="nimrose-user-avatar-img" style={style} />;
  }
  return (
    <span className="nimrose-user-avatar-fallback" style={style} title={name}>
      {initials(name) || "?"}
    </span>
  );
};

export default UserAvatar;
