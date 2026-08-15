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
        background: "linear-gradient(135deg, var(--ne-clay), var(--ne-soil))",
        borderBottom: "1px solid var(--ne-border)",
        boxShadow: "0 8px 20px oklch(0.08 0.015 70 / 0.24)",
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
            color: "var(--ne-amber)",
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
          color: "var(--ne-cream)",
          margin: 0,
        }}
      >
        {title}
      </h1>
      {right && <div>{right}</div>}
    </header>
  );
}
