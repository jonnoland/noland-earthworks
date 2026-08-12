/*
 * DESIGN: Heavy Equipment Grit — full-width dark amber-accented stats band
 * Counters display final values immediately; animate only when scrolled into view.
 * Stats: Free Estimates | 35+ Projects | 35 Counties Served | 24hr Quote Turnaround
 */
import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 0, suffix: "", label: "On-Site Estimates", display: "Free", sub: "Walk the property before quoting" },
  { value: 35, suffix: "+", label: "Projects Completed", display: null, sub: "Across Middle & West TN" },
  { value: 35, suffix: "", label: "Counties Served", display: null, sub: "Middle & West Tennessee" },
  { value: 24, suffix: "hr", label: "Quote Turnaround", display: null, sub: "Avg. response time" },
];

function useCountUp(target: number, duration = 1200, active: boolean) {
  const [count, setCount] = useState(target);
  const hasRun = useRef(false);
  useEffect(() => {
    if (!active || hasRun.current) return;
    hasRun.current = true;
    setCount(0);
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

function StatItem({
  value,
  suffix,
  label,
  active,
  display,
  sub,
}: {
  value: number;
  suffix: string;
  label: string;
  active: boolean;
  display?: string | null;
  sub?: string;
}) {
  const count = useCountUp(value, 1200, active);
  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      <div
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(2rem, 4vw, 3rem)",
          lineHeight: 1,
          color: "#E07B2A",
          letterSpacing: "0.02em",
        }}
      >
        {display ?? `${count}${suffix}`}
      </div>
      <div
        style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 600,
          fontSize: "0.75rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(240,237,230,0.85)",
          marginTop: "0.5rem",
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 400,
            fontSize: "0.68rem",
            letterSpacing: "0.05em",
            color: "rgba(240,237,230,0.45)",
            marginTop: "0.2rem",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="stats"
      ref={ref}
      style={{
        backgroundColor: "#0F1A0F",
        borderTop: "1px solid rgba(224,123,42,0.3)",
        borderBottom: "1px solid rgba(224,123,42,0.3)",
      }}
    >
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              style={{
                borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <StatItem {...s} active={active} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
