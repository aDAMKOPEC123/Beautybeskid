import { useEffect, useRef } from 'react';
import { skinWeatherApi } from '@/api/skin-weather.api';

async function reversGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pl`,
    );
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || 'Twoja lokalizacja';
  } catch {
    return 'Twoja lokalizacja';
  }
}

/**
 * Automatically detects browser geolocation on mount and silently updates
 * the user's stored location. Used by SkinWeatherProfile and SkinWeatherWidget.
 * Safe to call even when no profile exists — the server ignores it then.
 */
export function useSkinWeatherLocation(enabled = true) {
  const ran = useRef(false);

  useEffect(() => {
    if (!enabled || ran.current || !navigator.geolocation) return;
    ran.current = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: locationLat, longitude: locationLng } = pos.coords;
        const cityName = await reversGeocode(locationLat, locationLng);
        try {
          await skinWeatherApi.updateLocation({ locationLat, locationLng, cityName });
        } catch {
          // Silently ignore — e.g. no profile yet, or not logged in
        }
      },
      () => {
        // Permission denied or unavailable — do nothing
      },
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }, // accept cached position up to 5 min old
    );
  }, [enabled]);
}
