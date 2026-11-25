"use client";

import { useEffect, useState } from "react";
import LegalIcon from "./LegalIcon";

function getDisplayAddress(location) {
  const city = typeof location.city === "string" ? location.city.trim() : "";
  const province = typeof location.province === "string" ? location.province.trim() : "";
  const address = typeof location.address === "string" ? location.address.trim() : "";
  const normalizedAddress = address.replace(/[\s،,]+/g, " ").toLocaleLowerCase("fa");
  const genericAddresses = new Set([
    city.replace(/\s+/g, " ").toLocaleLowerCase("fa"),
    province.replace(/\s+/g, " ").toLocaleLowerCase("fa"),
    (city + " " + province).replace(/\s+/g, " ").toLocaleLowerCase("fa"),
    (province + " " + city).replace(/\s+/g, " ").toLocaleLowerCase("fa"),
  ]);
  const parts = [
    ...(address && !genericAddresses.has(normalizedAddress) ? [address] : []),
    city,
    province,
  ].filter(Boolean);
  return [...new Set(parts)].join("، ");
}

export default function OfficeLocationPublic() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/office-location")
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
      <div className="public-office-mark" aria-hidden="true"><LegalIcon name="pin" size={22} /></div>
      <div className="public-office-copy">
        <strong>{location.office_name || "نشانی دفتر"}</strong>
        <span>{getDisplayAddress(location)}</span>
      </div>
      {mapHref && <a className="public-office-map" href={mapHref} target="_blank" rel="noopener noreferrer">نمایش روی نقشه ↗</a>}
    </section>
  );
}
