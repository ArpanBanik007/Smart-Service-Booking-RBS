import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet's default icon URLs for Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom User Location Pin (Blue)
export const userLocationIcon = L.divIcon({
  className: "custom-user-marker",
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <span style="position: absolute; width: 24px; height: 24px; border-radius: 9999px; background-color: #3b82f6; opacity: 0.4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <span style="position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 9999px; background-color: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></span>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom Provider Marker Pin (Brand Indigo)
export const createProviderIcon = (label = "") => {
  return L.divIcon({
    className: "custom-provider-marker",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 12px; background: #4f46e5; color: #ffffff; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); border: 2px solid #ffffff;">
        ${label || "P"}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Custom Coordinate Picker Pin
export const pickerIcon = L.divIcon({
  className: "custom-picker-marker",
  html: `
    <div style="position: relative; width: 32px; height: 42px;">
      <svg viewBox="0 0 24 24" width="32" height="42" fill="#ef4444" stroke="#ffffff" stroke-width="1.5" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});
