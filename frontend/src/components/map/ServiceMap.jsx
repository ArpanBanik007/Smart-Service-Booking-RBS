import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Link } from "react-router-dom";
import { FiStar, FiMapPin, FiNavigation } from "react-icons/fi";
import {
  userLocationIcon,
  createProviderIcon,
  pickerIcon,
} from "../../utils/leafletConfig.js";

// Helper to recenter map dynamically when center coordinates change
function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// Click handler for location picking
function LocationPickerHandler({ onPick }) {
  useMapEvents({
    click(e) {
      if (onPick) {
        onPick({
          latitude: Number(e.latlng.lat.toFixed(6)),
          longitude: Number(e.latlng.lng.toFixed(6)),
        });
      }
    },
  });
  return null;
}

export default function ServiceMap({
  center = [22.5726, 88.3639], // Default Kolkata center
  zoom = 13,
  userLocation, // { latitude, longitude, radiusKm }
  providers = [], // Array of { _id, businessName, rating, distanceInKm, serviceArea: { coordinates: [lng, lat] } }
  selectedLocation, // { latitude, longitude } for coordinate picker mode
  onSelectLocation, // Callback when map is clicked in picker mode
  className = "h-[450px] w-full rounded-2xl shadow-inner",
  interactive = true,
}) {
  const mapCenter =
    selectedLocation?.latitude && selectedLocation?.longitude
      ? [selectedLocation.latitude, selectedLocation.longitude]
      : userLocation?.latitude && userLocation?.longitude
      ? [userLocation.latitude, userLocation.longitude]
      : center;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={mapCenter} zoom={zoom} />

        {/* Picker Mode Click Event */}
        {onSelectLocation && <LocationPickerHandler onPick={onSelectLocation} />}

        {/* Picked Location Marker */}
        {selectedLocation?.latitude && selectedLocation?.longitude && (
          <Marker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={pickerIcon}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-slate-900">Selected Location</p>
                <p className="text-slate-500">
                  {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* User Location Marker & Search Radius Circle */}
        {userLocation?.latitude && userLocation?.longitude && (
          <>
            <Marker
              position={[userLocation.latitude, userLocation.longitude]}
              icon={userLocationIcon}
            >
              <Popup>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                  <FiNavigation className="text-blue-600" />
                  Your Location
                </div>
              </Popup>
            </Marker>

            {userLocation.radiusKm && (
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={userLocation.radiusKm * 1000}
                pathOptions={{
                  fillColor: "#4f46e5",
                  fillOpacity: 0.08,
                  color: "#6366f1",
                  weight: 1.5,
                  dashArray: "4 6",
                }}
              />
            )}
          </>
        )}

        {/* Provider Markers */}
        {providers.map((provider) => {
          const coords =
            provider.serviceArea?.coordinates ||
            provider.serviceArea?.location?.coordinates ||
            provider.location?.coordinates;
          if (
            !Array.isArray(coords) ||
            coords.length !== 2 ||
            !Number.isFinite(coords[0]) ||
            !Number.isFinite(coords[1])
          ) {
            return null;
          }

          const [lng, lat] = coords;

          return (
            <Marker
              key={provider._id}
              position={[lat, lng]}
              icon={createProviderIcon(provider.businessName?.charAt(0))}
            >
              <Popup>
                <div className="w-48 p-1">
                  <h4 className="font-bold text-slate-900 text-sm">
                    {provider.businessName}
                  </h4>
                  <p className="line-clamp-2 text-xs text-slate-500 mt-0.5">
                    {provider.description || "Local Service Professional"}
                  </p>

                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <span className="flex items-center gap-1 font-semibold text-amber-600">
                      <FiStar className="fill-amber-400 text-amber-500" />
                      {provider.rating?.toFixed(1) || "5.0"}
                    </span>
                    {provider.distanceInKm !== undefined && (
                      <span className="flex items-center gap-0.5 text-slate-500">
                        <FiMapPin className="text-indigo-600" />
                        {provider.distanceInKm} km away
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/providers/${provider._id}`}
                    className="mt-3 block w-full rounded-lg bg-indigo-600 py-1.5 text-center text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    View Services
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
