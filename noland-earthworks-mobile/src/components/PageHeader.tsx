import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function PageHeader({ title, showBack = false, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="safe-top no-select"
      style={{
        backgroundColor: "oklch(0.16 0 0)",
        borderBottom: "1px solid oklch(0.25 0 0)",
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        gap: 8,
        minHeight: 56,
      }}
    >
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            color: "oklch(0.65 0.18 50)",
            background: "none",
            border: "none",
            padding: "4px 0",
            cursor: "pointer",
            marginRight: 4,
          }}
        >
          <ChevronLeft size={24} />
        </button>
      )}
      <h1
        style={{
          flex: 1,
          fontSize: 18,
          fontWeight: 600,
          color: "oklch(0.94 0.01 80)",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {right && <div>{right}</div>}
    </header>
  );
}
