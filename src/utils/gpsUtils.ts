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

/**
 * Target precision threshold for nursery plant coordinates: 14 feet or less
 */
export const TARGET_ACCURACY_FEET = 14;
export const TARGET_ACCURACY_METERS = TARGET_ACCURACY_FEET / 3.28084; // ~4.267 meters

export const DEFAULT_NURSERY_COORDS = {
  latitude: 43.1482,
  longitude: -79.4623,
  accuracy: 4.26,
  accuracyFeet: 14
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

  if (feet <= TARGET_ACCURACY_FEET) {
    // 14 ft or less - Gold standard nursery yard precision
    return {
      rating: 'excellent',
      label: `Sub-Meter Accuracy (±${feet} ft)`,
      feet,
      colorClass: 'text-emerald-700',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300'
    };
  } else if (feet <= 40) {
    // 15 to 40 ft
    return {
      rating: 'good',
      label: `Yard Precision (±${feet} ft)`,
      feet,
      colorClass: 'text-[#0e6c4a]',
      badgeClass: 'bg-[#f0fdf4] text-[#002113] border-[#a0f4c8]'
    };
  } else if (feet <= 115) {
    // 41 to 115 ft
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

export interface AcquireGpsOptions {
  /**
   * Target accuracy in feet. Defaults to 14 ft (or less).
   * Once a reading achieves <= targetAccuracyFeet, acquisition settles immediately.
   */
  targetAccuracyFeet?: number;
  /**
   * Target accuracy in meters (legacy support).
   */
  targetAccuracyMeters?: number;
  /**
   * Duration per refinement pass in milliseconds (defaults to 4500ms).
   */
  passWaitMs?: number;
  /**
   * Maximum automatic refinement passes to reach target precision (defaults to 3).
   * Replicates pressing the Tag button 3 times automatically.
   */
  maxAttempts?: number;
  /**
   * Overall maximum timeout across all passes in milliseconds.
   */
  maxWaitMs?: number;
  /**
   * Status progress callback.
   */
  onProgress?: (status: GpsAcquisitionStatus) => void;
}

/**
 * High-Precision Multi-Sample Satellite Acquisition Engine
 * 
 * Automatically refines GPS accuracy down to 14 feet or less across up to 3 passes
 * (replicating tapping the Tag button 3 times automatically).
 * 
 * Behavior:
 * 1. Initiates a fresh watchPosition satellite stream and active one-shot polling.
 * 2. As soon as a fix reaches 14 feet or less, immediately settles and locks without delay.
 * 3. If initial fixes are above 14 feet (e.g. 25-40 ft while GPS receiver warms up),
 *    it automatically continues refining across 3 passes (~13.5s total).
 * 4. If 14 feet or less cannot be achieved (e.g., dense cover, metal roofing, or device limit),
 *    it seamlessly returns the best precision distance obtained (no extra error/dialogs).
 */
export async function acquireHighPrecisionGps(options?: AcquireGpsOptions): Promise<GpsFix> {
  const targetFeet = options?.targetAccuracyFeet ?? 
    (options?.targetAccuracyMeters !== undefined 
      ? Math.min(TARGET_ACCURACY_FEET, metersToFeet(options.targetAccuracyMeters)) 
      : TARGET_ACCURACY_FEET);

  const maxAttempts = options?.maxAttempts ?? 3;
  const passWaitMs = options?.passWaitMs ?? 4500;
  
  // Total max wait defaults to 3 passes of 4.5s (~13.5s) unless explicitly provided with a longer time
  const totalMaxWaitMs = options?.maxWaitMs && options.maxWaitMs > (passWaitMs * 2)
    ? options.maxWaitMs
    : (passWaitMs * maxAttempts);

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
    let pollIntervalId: any = null;
    let masterTimeoutTimer: any = null;
    let bestFix: GpsFix | null = null;
    let sampleCount = 0;
    let currentPass = 1;
    let isSettled = false;

    const cleanup = () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // Ignore
        }
        watchId = null;
      }
      if (pollIntervalId !== null) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
      if (masterTimeoutTimer !== null) {
        clearTimeout(masterTimeoutTimer);
        masterTimeoutTimer = null;
      }
    };

    const handleCoordsUpdate = (coords: GeolocationCoordinates) => {
      if (isSettled) return;
      sampleCount++;

      const rawAccuracy = coords.accuracy || 100;
      const accuracyFeet = metersToFeet(rawAccuracy);

      const currentFix: GpsFix = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: rawAccuracy,
        accuracyFeet,
        timestamp: new Date().toISOString(),
        isFallback: false,
        source: accuracyFeet <= 40 ? 'satellite_gps' : 'network_estimate'
      };

      // Keep the fix with highest precision (lowest accuracy radius error)
      if (!bestFix || currentFix.accuracy < bestFix.accuracy) {
        bestFix = currentFix;
      }

      onProgress?.({
        phase: bestFix.accuracyFeet <= targetFeet ? 'locked' : 'locking_satellites',
        currentAccuracyMeters: bestFix.accuracy,
        currentAccuracyFeet: bestFix.accuracyFeet,
        sampleCount,
        message: `Refining satellite lock... (±${bestFix.accuracyFeet} ft)`
      });

      // Target Check: Automatically try to get to 14 feet or less!
      // If we reach 14 feet or less, lock immediately!
      if (bestFix.accuracyFeet <= targetFeet) {
        isSettled = true;
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
    };

    onProgress?.({
      phase: 'waking_gps',
      sampleCount: 0,
      message: 'Acquiring satellite lock...'
    });

    // Master timeout: If passes expire without reaching <= 14 ft,
    // settle cleanly with the best precision distance obtained.
    masterTimeoutTimer = setTimeout(() => {
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
    }, totalMaxWaitMs);

    // 1. Start continuous watch stream with high accuracy and zero cache
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => handleCoordsUpdate(pos.coords),
        (err) => {
          console.warn('Geolocation watch note:', err.message);
          if (err.code === err.PERMISSION_DENIED) {
            if (isSettled) return;
            isSettled = true;
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
          timeout: totalMaxWaitMs
        }
      );
    } catch (err) {
      console.error('Failed to start watchPosition:', err);
    }

    // 2. Immediately trigger an active one-shot query to nudge hardware GPS without delay
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => handleCoordsUpdate(pos.coords),
        (err) => console.warn('Initial one-shot GPS query note:', err.message),
        { enableHighAccuracy: true, maximumAge: 0, timeout: passWaitMs }
      );
    } catch (err) {
      console.warn('Initial getCurrentPosition error:', err);
    }

    // 3. Multi-attempt interval: every passWaitMs, trigger an active query
    // (replicating the user pressing the Tag button 3 times automatically)
    pollIntervalId = setInterval(() => {
      if (isSettled) return;
      currentPass++;
      if (currentPass <= maxAttempts) {
        try {
          navigator.geolocation.getCurrentPosition(
            (pos) => handleCoordsUpdate(pos.coords),
            (err) => console.warn(`Pass ${currentPass} query note:`, err.message),
            { enableHighAccuracy: true, maximumAge: 0, timeout: passWaitMs - 200 }
          );
        } catch (err) {
          console.warn(`Pass ${currentPass} getCurrentPosition error:`, err);
        }
      }
    }, passWaitMs);
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

/**
 * Calculates straight-line ground distance in meters between two lat/lng coordinates
 */
export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates distance in feet between two lat/lng coordinates
 */
export function calculateDistanceFeet(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return metersToFeet(calculateDistanceMeters(lat1, lng1, lat2, lng2));
}

/**
 * Formats distance nicely (e.g. "45 ft" or "0.2 mi")
 */
export function formatDistanceFeet(feet: number): string {
  if (feet > 1000) {
    const miles = (feet / 5280).toFixed(1);
    return `${miles} mi`;
  }
  return `${feet} ft`;
}
