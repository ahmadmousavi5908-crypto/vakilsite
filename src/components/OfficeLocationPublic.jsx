import LegalIcon from "./LegalIcon";

function getDisplayAddress(location) {
  const city = typeof location.city === "string" ? location.city.trim() : "";
  const province = typeof location.province === "string" ? location.province.trim() : "";
  return [city, province].filter(Boolean).join("، ");
}

export default function OfficeLocationPublic({ initialLocation = null }) {
  const location = initialLocation;
  if (!location) return null;

  const city = typeof location.city === "string" ? location.city.trim() : "";
  const province = typeof location.province === "string" ? location.province.trim() : "";
  const mapQuery = [city, province].filter(Boolean).join(", ");
  const mapHref = mapQuery
    ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery)
    : "";

  return (
    <section className="public-office-location" aria-label="موقعیت دفتر">
      <div className="public-office-mark" aria-hidden="true"><LegalIcon name="pin" size={22} /></div>
      <div className="public-office-copy">
        <strong>{location.office_name || "دفتر خدمات حقوقی"}</strong>
        <span>{getDisplayAddress(location)}</span>
      </div>
      {mapHref && <a className="public-office-map" href={mapHref} target="_blank" rel="noopener noreferrer">نمایش محدوده فعالیت ↗</a>}
    </section>
  );
}
