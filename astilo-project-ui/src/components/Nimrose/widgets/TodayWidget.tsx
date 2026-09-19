import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthProvider";

const greeting = (hour: number) => (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

const TodayWidget = () => {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div>
      <p className="nimrose-today-greeting">
        {greeting(now.getHours())}, <span className="gradient-text">{firstName}</span>
      </p>
      <p className="nimrose-today-date">
        {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>
      <p className="nimrose-today-time">{now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
    </div>
  );
};

export default TodayWidget;
