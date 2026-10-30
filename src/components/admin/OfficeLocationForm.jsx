"use client";

import { useState } from "react";

export default function OfficeLocationForm({ initialData, action }) {
  const [gpsMessage, setGpsMessage] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsMessage("مرورگر شما از دریافت موقعیت پشتیبانی نمی‌کند.");
      return;
    }
    setGpsLoading(true);
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = document.getElementById("office-latitude");
        const longitude = document.getElementById("office-longitude");
        if (latitude) latitude.value = position.coords.latitude.toFixed(7);
        if (longitude) longitude.value = position.coords.longitude.toFixed(7);
        setGpsLoading(false);
        setGpsMessage("مختصات دستگاه دریافت شد. پیش از ذخیره، محل را بررسی کنید.");
      },
      () => {
        setGpsLoading(false);
        setGpsMessage("دریافت موقعیت انجام نشد. اجازه دسترسی GPS را بررسی کنید یا مختصات را دستی وارد کنید.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  return (
    <form action={action} className="office-form">
      <div className="office-form-grid">
        <div className="admin-field"><label htmlFor="office-name">عنوان دفتر</label><input id="office-name" name="office_name" defaultValue={initialData.office_name || ""} placeholder="مثلاً دفتر وکالت" maxLength={120} /></div>
        <div className="admin-field"><label htmlFor="office-phone">شماره تماس دفتر</label><input id="office-phone" name="phone" defaultValue={initialData.phone || ""} inputMode="tel" maxLength={30} placeholder="شماره تماس قابل نمایش" /></div>
        <div className="admin-field full"><label htmlFor="office-address">نشانی کامل دفتر</label><textarea id="office-address" name="address" defaultValue={initialData.address || ""} rows={3} maxLength={500} placeholder="استان، شهر، خیابان، کوچه، پلاک و واحد" /></div>
        <div className="admin-field"><label htmlFor="office-province">استان</label><input id="office-province" name="province" defaultValue={initialData.province || ""} placeholder="خوزستان" maxLength={80} /></div>
        <div className="admin-field"><label htmlFor="office-city">شهر</label><input id="office-city" name="city" defaultValue={initialData.city || ""} placeholder="اهواز" maxLength={80} /></div>
        <div className="admin-field"><label htmlFor="office-postal">کد پستی <small>اختیاری</small></label><input id="office-postal" name="postal_code" defaultValue={initialData.postal_code || ""} maxLength={20} /></div>
        <div className="admin-field"><label htmlFor="office-map">لینک موقعیت در نقشه <small>اختیاری</small></label><input id="office-map" name="map_url" type="url" defaultValue={initialData.map_url || ""} placeholder="https://..." /></div>
      </div>

      <div className="admin-gps-box">
        <div className="admin-gps-heading"><div><strong>مختصات دقیق GPS</strong><p>طول و عرض جغرافیایی محل دفتر را وارد کنید.</p></div><button type="button" onClick={useCurrentLocation} disabled={gpsLoading}>{gpsLoading ? "در حال دریافت..." : "⌖ دریافت موقعیت فعلی"}</button></div>
        <div className="office-form-grid gps-grid">
          <div className="admin-field"><label htmlFor="office-latitude">عرض جغرافیایی (Latitude)</label><input id="office-latitude" name="latitude" type="number" step="any" min="-90" max="90" defaultValue={initialData.latitude ?? ""} placeholder="مثلاً 31.3183" /></div>
          <div className="admin-field"><label htmlFor="office-longitude">طول جغرافیایی (Longitude)</label><input id="office-longitude" name="longitude" type="number" step="any" min="-180" max="180" defaultValue={initialData.longitude ?? ""} placeholder="مثلاً 48.6706" /></div>
        </div>
        {gpsMessage && <p className="admin-gps-message" role="status">{gpsMessage}</p>}
        {initialData.latitude != null && initialData.longitude != null && <a className="admin-map-preview" href={`https://www.google.com/maps?q=${initialData.latitude},${initialData.longitude}`} target="_blank" rel="noreferrer">مشاهده مختصات ثبت‌شده روی نقشه ↗</a>}
      </div>

      <label className="admin-public-toggle"><input type="checkbox" name="is_location_public" defaultChecked={Boolean(initialData.is_location_public)} /><span><strong>نمایش موقعیت دفتر در وب‌سایت</strong><small>با خاموش بودن این گزینه، موقعیت در سایت عمومی نمایش داده نمی‌شود.</small></span></label>
      <div className="admin-form-actions"><button type="submit">ذخیره اطلاعات دفتر <span>←</span></button><small>آخرین تغییرات فقط پس از ذخیره اعمال می‌شوند.</small></div>
    </form>
  );
}
