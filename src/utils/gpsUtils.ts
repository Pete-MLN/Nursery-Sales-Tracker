/**
 * High-Precision GPS and Yard Navigation Utilities for Maple Lane Nursery
 * 
 * Provides multi-sample satellite lock acquisition to eliminate cellular/Wi-Fi drift
 * (preventing 200+ yard errors) and generates accurate Google Maps pin/satellite URLs.
 */

export interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  accuracyFeet: number;
  timestamp: string;
  isFallback?: boolean;
  source: 'satellite_gps' | 'network_estimate' | 'nursery_fallback';
}

export interface GpsAcquisitionStatus {
  phase: 'waking_gps' | 'locking_satellites' | 'locked' | 'fallback' | 'error';
  currentAccuracyMeters?: number;
  currentAccuracyFeet?: number;
  sampleCount: number;
  message: string;
}

export const DEFAULT_NURSERY_COORDS = {
  latitude: 43.1482,
  longitude: -79.4623,
  accuracy: 5.0,
  accuracyFeet: 16
};

/**
 * Converts meters to feet
 */
export function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28084);
}

/**
 * Formats GPS coordinates with cardinal directions and optional accuracy rating
 * Example: 43.14820° N, 79.46230° W (±6 ft)
 */
export function formatGpsCoordinates(lat: number, lng: number, accuracyMeters?: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  const formatted = `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
  
  if (accuracyMeters !== undefined && accuracyMeters > 0) {
    const feet = metersToFeet(accuracyMeters);
    return `${formatted} (±${feet} ft)`;
  }
  return formatted;
}

/**
 * Quality rating helper based on GPS accuracy radius
 */
export function getGpsAccuracyRating(accuracyMeters?: number): {
  rating: 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown';
  label: string;
  feet: number;
  colorClass: string;
  badgeClass: string;
} {
  if (accuracyMeters === undefined || accuracyMeters <= 0) {
    return {
      rating: 'unknown',
      label: 'GPS Tagged',
      feet: 0,
      colorClass: 'text-[#012d1d]',
      badgeClass: 'bg-[#e8f5e9] text-[#012d1d] border-[#a0f4c8]'
    };
  }

  const feet = metersToFeet(accuracyMeters);

  if (accuracyMeters <= 5) {
    // Under ~16 ft
    return {
      rating: 'excellent',
      label: `Sub-Meter Accuracy (±${feet} ft)`,
      feet,
      colorClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300'
    };
  } else if (accuracyMeters <= 12) {
    // 16 to 40 ft
    return {
      rating: 'good',
      label: `Yard Precision (±${feet} ft)`,
      feet,
      colorClass: 'text-[#0e6c4a]',
      badgeClass: 'bg-[#f0fdf4] text-[#002113] border-[#a0f4c8]'
    };
  } else if (accuracyMeters <= 35) {
    // 40 to 115 ft
    return {
      rating: 'moderate',
      label: `Moderate Lock (±${feet} ft)`,
      feet,
      colorClass: 'text-amber-800',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-300'
    };
  } else {
    // > 115 ft (usually cellular/wifi tower estimate)
    return {
      rating: 'poor',
      label: `Approximate / Cellular (±${feet} ft)`,
      feet,
      colorClass: 'text-orange-800',
      badgeClass: 'bg-orange-50 text-orange-900 border-orange-300'
    };
  }
}

/**
 * High-Precision Multi-Sample Satellite Acquisition Engine
 * 
 * Why standard navigator.geolocation.getCurrentPosition fails:
 * - When called once, mobile devices immediately return the first cached position,
 *   which is almost always Wi-Fi or Cell Tower triangulation (~100-300 meters / 200+ yards off).
 * - Hardware GPS satellites take 1-3 seconds to acquire fixes and converge down to 3-5 meters.
 * 
 * This function:
 * 1. Initiates a fresh `watchPosition` stream with maximum accuracy and zero cache age.
 * 2. Continuously samples GPS fixes for up to `maxWaitMs` (default 4.5s).
 * 3. If an immediate fix <= `targetAccuracyMeters` (default 4.5m) is obtained, locks immediately.
 * 4. Otherwise, collects all fixes and picks the single best fix with the lowest accuracy error.
 */
export async function acquireHighPrecisionGps(options?: {
  maxWaitMs?: number;
  targetAccuracyMeters?: number;
  onProgress?: (status: GpsAcquisitionStatus) => void;
}): Promise<GpsFix> {
  const maxWaitMs = options?.maxWaitMs ?? 4500;
  const targetAccuracy = options?.targetAccuracyMeters ?? 4.5;
  const onProgress = options?.onProgress;

  if (!navigator.geolocation) {
    const fallback: GpsFix = {
      latitude: DEFAULT_NURSERY_COORDS.latitude,
      longitude: DEFAULT_NURSERY_COORDS.longitude,
      accuracy: DEFAULT_NURSERY_COORDS.accuracy,
      accuracyFeet: DEFAULT_NURSERY_COORDS.accuracyFeet,
      timestamp: new Date().toISOString(),
      isFallback: true,
      source: 'nursery_fallback'
    };
    onProgress?.({
      phase: 'fallback',
      sampleCount: 0,
      message: 'Geolocation not supported by device, used yard reference point.'
    });
    return fallback;
  }

  return new Promise<GpsFix>((resolve) => {
    let watchId: number | null = null;
    let bestFix: GpsFix | null = null;
    let sampleCount = 0;
    let isSettled = false;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    onProgress?.({
      phase: 'waking_gps',
      sampleCount: 0,
      message: 'Acquiring satellite lock...'
    });

    const timeoutTimer = setTimeout(() => {
      if (isSettled) return;
      isSettled = true;
      cleanup();

      if (bestFix) {
        onProgress?.({
          phase: 'locked',
          currentAccuracyMeters: bestFix.accuracy,
          currentAccuracyFeet: bestFix.accuracyFeet,
          sampleCount,
          message: `GPS Locked (±${bestFix.accuracyFeet} ft)`
        });
        resolve(bestFix);
      } else {
        // Safe fallback if timeout reached without single fix
        const fallback: GpsFix = {
          latitude: DEFAULT_NURSERY_COORDS.latitude,
          longitude: DEFAULT_NURSERY_COORDS.longitude,
          accuracy: DEFAULT_NURSERY_COORDS.accuracy,
          accuracyFeet: DEFAULT_NURSERY_COORDS.accuracyFeet,
          timestamp: new Date().toISOString(),
          isFallback: true,
          source: 'nursery_fallback'
        };
        onProgress?.({
          phase: 'fallback',
          sampleCount: 0,
          message: 'Acquisition timeout, using nursery yard location.'
        });
        resolve(fallback);
      }
    }, maxWaitMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (isSettled) return;
          sampleCount++;

          const rawAccuracy = pos.coords.accuracy || 100;
          const currentFix: GpsFix = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: rawAccuracy,
            accuracyFeet: metersToFeet(rawAccuracy),
            timestamp: new Date().toISOString(),
            isFallback: false,
            source: rawAccuracy <= 15 ? 'satellite_gps' : 'network_estimate'
          };

          // Keep the fix with highest precision (lowest accuracy radius)
          if (!bestFix || currentFix.accuracy < bestFix.accuracy) {
            bestFix = currentFix;
          }

          onProgress?.({
            phase: currentFix.accuracy <= 10 ? 'locked' : 'locking_satellites',
            currentAccuracyMeters: bestFix.accuracy,
            currentAccuracyFeet: bestFix.accuracyFeet,
            sampleCount,
            message: `Refining satellite lock... (±${bestFix.accuracyFeet} ft)`
          });

          // If we hit our gold-standard precision target (< 4.5m / ~15ft), lock immediately!
          if (bestFix.accuracy <= targetAccuracy) {
            isSettled = true;
            clearTimeout(timeoutTimer);
            cleanup();
            onProgress?.({
              phase: 'locked',
              currentAccuracyMeters: bestFix.accuracy,
              currentAccuracyFeet: bestFix.accuracyFeet,
              sampleCount,
              message: `High-Precision GPS Locked (±${bestFix.accuracyFeet} ft)`
            });
            resolve(bestFix);
          }
        },
        (err) => {
          console.warn('Geolocation sample warning:', err.message);
          // If we haven't acquired any fix yet and error is permission denied
          if (err.code === err.PERMISSION_DENIED) {
            if (isSettled) return;
            isSettled = true;
            clearTimeout(timeoutTimer);
            cleanup();
            const fallback: GpsFix = {
              latitude: DEFAULT_NURSERY_COORDS.latitude,
              longitude: DEFAULT_NURSERY_COORDS.longitude,
              accuracy: DEFAULT_NURSERY_COORDS.accuracy,
              accuracyFeet: DEFAULT_NURSERY_COORDS.accuracyFeet,
              timestamp: new Date().toISOString(),
              isFallback: true,
              source: 'nursery_fallback'
            };
            onProgress?.({
              phase: 'error',
              sampleCount,
              message: 'GPS permission denied. Using nursery yard location.'
            });
            resolve(fallback);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: maxWaitMs
        }
      );
    } catch (err) {
      console.error('Failed to start watchPosition:', err);
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timeoutTimer);
      cleanup();
      resolve({
        latitude: DEFAULT_NURSERY_COORDS.latitude,
        longitude: DEFAULT_NURSERY_COORDS.longitude,
        accuracy: DEFAULT_NURSERY_COORDS.accuracy,
        accuracyFeet: DEFAULT_NURSERY_COORDS.accuracyFeet,
        timestamp: new Date().toISOString(),
        isFallback: true,
        source: 'nursery_fallback'
      });
    }
  });
}

/**
 * Generates an exact Google Maps Drop-Pin URL in high-resolution Satellite view.
 * 
 * Using `q=loc:LAT,LNG+(Label)&ll=LAT,LNG&z=20&t=k` guarantees:
 * 1. Google Maps drops a distinct RED PIN on the exact plant location (NOT a transit road route).
 * 2. `t=k` opens in Satellite view directly at maximum yard zoom (`z=20`).
 * 3. The marker popup shows the plant name and nursery identifier.
 */
export function generateGoogleMapsPinUrl(lat: number, lng: number, plantLabel?: string): string {
  const cleanLabel = (plantLabel || 'Maple Lane Nursery Plant').replace(/[()]/g, '');
  return `https://www.google.com/maps?q=loc:${lat.toFixed(6)},${lng.toFixed(6)}+(${encodeURIComponent(cleanLabel)})&ll=${lat.toFixed(6)},${lng.toFixed(6)}&z=20&t=k`;
}

/**
 * Generates a Google Maps Walking Directions URL from the user's current location to the plant pin
 */
export function generateGoogleMapsWalkingUrl(destLat: number, destLng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat.toFixed(6)},${destLng.toFixed(6)}&travelmode=walking`;
}
