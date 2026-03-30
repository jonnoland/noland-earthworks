/*
 * DESIGN: Heavy Equipment Grit — dark section with county grid and embedded map
 */
import { MapPin } from "lucide-react";
import { useRef, useEffect, useState } from "react";

const counties = [
  "Lewis County", "Maury County", "Perry County", "Benton County",
  "Sumner County", "Wilson County", "Dickson County", "Hickman County",
  "Houston County", "Stewart County", "Cheatham County", "Davidson County",
  "Humphreys County", "Robertson County", "Montgomery County",
  "Rutherford County", "Williamson County",
];

export default function ServiceAreasSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="service-areas"
      style={{
        backgroundColor: "#0F1A0F",
        paddingTop: "6rem",
        paddingBottom: "6rem",
        borderTop: "1px solid rgba(224,123,42,0.15)",
      }}
    >
      <div className="container">
        {/* Header */}
        <div
          ref={ref}
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
            marginBottom: "3rem",
          }}
        >
          <div className="section-label mb-4">Coverage</div>
          <h2
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#F0EDE6",
              marginBottom: "0.75rem",
            }}
          >
            Our Service Areas
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: "rgba(240,237,230,0.65)",
            }}
          >
            Noland Earthworks proudly serves 17 counties across Middle Tennessee.
            Check if we're available in your area.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start" style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.5s ease 0.2s, transform 0.5s ease 0.2s' }}>
          {/* County list */}
          <div>
            <div
              className="flex items-center gap-2 mb-4"
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                fontSize: "0.875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#E07B2A",
              }}
            >
              <MapPin size={16} />
              Counties Served
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {counties.map((county) => (
                <div
                  key={county}
                  className="flex items-center gap-2 py-2 px-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 400,
                    fontSize: "0.8125rem",
                    color: "rgba(240,237,230,0.75)",
                    letterSpacing: "0.02em",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "#E07B2A",
                      flexShrink: 0,
                      display: "block",
                    }}
                  />
                  {county}
                </div>
              ))}
            </div>
            <p
              className="mt-4"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "rgba(240,237,230,0.5)",
                fontStyle: "italic",
              }}
            >
              Don't see your area? Contact us to discuss service availability.
            </p>
          </div>

          {/* Map embed */}
          <div
            style={{
              border: "1px solid rgba(224,123,42,0.2)",
              overflow: "hidden",
              height: "400px",
            }}
          >
            <iframe
              title="Noland Earthworks Service Area — Middle Tennessee"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1640000!2d-87.0!3d35.8!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8864ec3213eb903d%3A0x7d3fb9d0a1e9daa0!2sMiddle%20Tennessee!5e0!3m2!1sen!2sus!4v1700000000000!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
