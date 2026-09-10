import AppRoutes from "./app/AppRoutes";

export default function App() {
  return (
    <div className="relative min-h-screen text-ink">
      <div className="aurora" aria-hidden>
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
      </div>
      <div className="relative z-10">
        <AppRoutes />
      </div>
    </div>
  );
}
