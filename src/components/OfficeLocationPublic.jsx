"use client";

import { useEffect, useState } from "react";

export default function OfficeLocationPublic() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/office-location", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (active && result.location) setLocation(result.location);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!location) return null;

  const coordinatesReady = location.latitude != null && location.longitude != null;
  const mapHref = location.map_url || (coordinatesReady
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : "");

  return (
    <section className="public-office-location" aria-label="موقعیت دفتر">
      <div className="public-office-mark">⌖</div>
      <div className="public-office-copy">
        <strong>{location.office_name || "نشانی دفتر"}</strong>
        <span>{[location.address, location.city, location.province].filter(Boolean).join("، ")}</span>
        {location.phone && <a href={`tel:${location.phone.replace(/[^0-9+]/g, "")}`} dir="ltr">{location.phone}</a>}
      </div>
      {mapHref && <a className="public-office-map" href={mapHref} target="_blank" rel="noreferrer">نمایش روی نقشه ↗</a>}
    </section>
  );
}
