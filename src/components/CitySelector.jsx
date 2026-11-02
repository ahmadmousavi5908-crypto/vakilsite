"use client";

export default function CitySelector({ cities }) {
  return (
    <div className="city-list" role="group" aria-label="انتخاب شهر محل درخواست">
      {cities.map((city, index) => (
        <button
          key={city}
          type="button"
          className={index === 0 ? "city-chip city-featured" : "city-chip"}
          aria-label={`انتخاب شهر ${city} و رفتن به فرم درخواست`}
          onClick={() => {
            window.dispatchEvent(
              new CustomEvent("vakilsite:city-selected", { detail: city })
            );
          }}
        >
          {city}
          {index === 0 && <b>مرکز</b>}
        </button>
      ))}
    </div>
  );
}
