/*
 * DESIGN: Heavy Equipment Grit — full-width dark amber-accented stats band
 * Counters display final values immediately; animate only when scrolled into view.
 */
import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 49, suffix: "", label: "Google Rating", prefix: "", display: "4.9★" },
  { value: 35, suffix: "", label: "Counties Served", prefix: "", display: null },
  { value: 24, suffix: "hr", label: "Quote Turnaround", prefix: "", display: null },
];

function useCountUp(target: number, duration = 1200, active: boolean) {
  // Start at final value so the stat is never shown as 0 on page load
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

function StatItem({ value, suffix, label, active, display }: { value: number; suffix: string; label: string; active: boolean; display?: string | null }) {
  const count = useCountUp(value, 1200, active);
  return (
    <div className="flex flex-col items-center text-center px-6 py-8">
      <div
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
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
          fontWeight: 400,
          fontSize: "0.8rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(240,237,230,0.6)",
          marginTop: "0.5rem",
        }}
      >
        {label}
      </div>
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
          observer.disconnect(); // only animate once
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
        <div
          className="grid grid-cols-1 sm:grid-cols-3"
          style={{}}
        >
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
