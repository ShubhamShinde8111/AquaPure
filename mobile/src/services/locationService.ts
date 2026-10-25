/**
 * AquaPure — Location & Reverse Geocoding Service
 *
 * Handles:
 * - Location permission checks & requests (Android, iOS, Web)
 * - Device GPS availability checks
 * - Current coordinates acquisition with timeout guards
 * - Accurate reverse geocoding to address components
 * - Native (expo-location) and Web/fallback geocoding pipelines
 */

import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface GeocodedAddressResult {
  addressLine1: string; // house, flat, building, or street
  addressLine2: string; // locality, area, district, landmark
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
  /** True when only street/road was found and house/flat number is missing */
  isHouseNumberMissing?: boolean;
  formattedAddress?: string;
}

export type LocationErrorCode =
  | 'PERMISSION_DENIED'
  | 'SERVICES_DISABLED'
  | 'TIMEOUT'
  | 'GEOCODE_FAILED'
  | 'UNAVAILABLE';

export interface LocationServiceResult {
  success: boolean;
  address?: GeocodedAddressResult;
  error?: string;
  errorCode?: LocationErrorCode;
}

/**
 * Web/fallback reverse geocoding via public endpoints (no client API keys required)
 */
async function reverseGeocodeWebFallback(
  latitude: number,
  longitude: number
): Promise<GeocodedAddressResult | null> {
  try {
    // 1. Try BigDataCloud Client Reverse Geocode API (free, CORS-enabled, client-safe)
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl);
    if (bdcRes.ok) {
      const data = await bdcRes.json();
      if (data && (data.city || data.locality || data.principalSubdivision)) {
        const locality = data.locality || '';
        const city = data.city || data.locality || '';
        const state = data.principalSubdivision || '';
        const pincode = (data.postcode || '').replace(/\D/g, '').slice(0, 6);
        const country = data.countryName || 'India';

        // Extract street or locality info
        let street = '';
        let houseNumber = '';
        if (Array.isArray(data.localityInfo?.administrative)) {
          const streetObj = data.localityInfo.administrative.find(
            (item: any) => item.adminLevel === 8 || item.adminLevel === 9 || item.description === 'street'
          );
          if (streetObj?.name) street = streetObj.name;
        }

        const addressLine1 = street || locality || '';
        const addressLine2 = locality && locality !== addressLine1 ? locality : '';

        return {
          addressLine1,
          addressLine2,
          city,
          state,
          pincode,
          country,
          latitude,
          longitude,
          isHouseNumberMissing: !houseNumber,
          formattedAddress: [addressLine1, addressLine2, city, state, pincode].filter(Boolean).join(', '),
        };
      }
    }
  } catch {
    // Continue to next fallback
  }

  try {
    // 2. Fallback to OpenStreetMap Nominatim
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AquaPure-Commerce-App/1.0',
      },
    });
    if (osmRes.ok) {
      const data = await osmRes.json();
      if (data && data.address) {
        const addr = data.address;
        const houseNumber = addr.house_number || '';
        const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.subdivision || addr.residential || '';
        const city = addr.city || addr.town || addr.village || addr.county || '';
        const state = addr.state || '';
        const pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);
        const country = addr.country || 'India';

        const line1Parts: string[] = [];
        if (houseNumber) line1Parts.push(houseNumber);
        if (road) line1Parts.push(road);

        const addressLine1 = line1Parts.join(', ') || suburb || '';
        const addressLine2 = suburb && suburb !== addressLine1 ? suburb : (addr.commercial || addr.industrial || '');

        return {
          addressLine1,
          addressLine2,
          city,
          state,
          pincode,
          country,
          latitude,
          longitude,
          isHouseNumberMissing: !houseNumber,
          formattedAddress: data.display_name,
        };
      }
    }
  } catch {
    // Fallback exhausted
  }

  return null;
}

export const LocationService = {
  /**
   * Request location permissions and obtain current address components
   */
  async getCurrentDeliveryAddress(): Promise<LocationServiceResult> {
    try {
      // 1. Check if location services are enabled on device (GPS toggle)
      if (Platform.OS !== 'web') {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return {
            success: false,
            error: 'Device location (GPS) is turned off. Please turn on GPS or enter your delivery address manually.',
            errorCode: 'SERVICES_DISABLED',
          };
        }
      }

      // 2. Request foreground location permission
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        return {
          success: false,
          error: canAskAgain
            ? 'Location permission was denied. You can enter your delivery address manually.'
            : 'Location permission is blocked. Please enable location access in your device settings or enter your address manually.',
          errorCode: 'PERMISSION_DENIED',
        };
      }

      // 3. Retrieve current GPS position with timeout protection (10 seconds)
      let coords: { latitude: number; longitude: number } | null = null;
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 10000)
        );

        const positionPromise = Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'android' ? Location.Accuracy.Balanced : Location.Accuracy.High,
        });

        const location = await Promise.race([positionPromise, timeoutPromise]);
        coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      } catch (posError: any) {
        // If current position timed out or failed, try last known position as fallback
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          if (lastKnown?.coords) {
            coords = {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            };
          }
        } catch {
          // ignore
        }

        if (!coords) {
          if (posError?.message === 'TIMEOUT') {
            return {
              success: false,
              error: 'Location request timed out. Please check your GPS signal or enter your address manually.',
              errorCode: 'TIMEOUT',
            };
          }
          return {
            success: false,
            error: 'Unable to retrieve your current location. Please enter your address manually.',
            errorCode: 'UNAVAILABLE',
          };
        }
      }

      const { latitude, longitude } = coords;

      // 4. Reverse geocode coordinates to readable address
      let parsedResult: GeocodedAddressResult | null = null;

      // On native platforms, prefer expo-location's reverseGeocodeAsync
      if (Platform.OS !== 'web') {
        try {
          const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
          if (geocoded && geocoded.length > 0) {
            const item = geocoded[0];
            const streetNumber = item.streetNumber || '';
            const street = item.street || '';
            const name = item.name || '';
            const district = item.district || '';
            const subregion = item.subregion || '';
            const city = item.city || district || subregion || '';
            const region = item.region || '';
            const postalCode = (item.postalCode || '').replace(/\D/g, '').slice(0, 6);
            const country = item.country || 'India';

            // Construct addressLine1 (house/building + street)
            let addressLine1 = '';
            let isHouseNumberMissing = false;

            if (streetNumber && street) {
              addressLine1 = `${streetNumber}, ${street}`;
            } else if (name && street && name.toLowerCase() !== street.toLowerCase()) {
              addressLine1 = `${name}, ${street}`;
            } else if (street) {
              addressLine1 = street;
              isHouseNumberMissing = true;
            } else if (name) {
              addressLine1 = name;
            } else {
              isHouseNumberMissing = true;
            }

            // Construct addressLine2 (district/locality/subregion)
            let addressLine2 = '';
            if (district && district.toLowerCase() !== city.toLowerCase()) {
              addressLine2 = district;
            } else if (subregion && subregion.toLowerCase() !== city.toLowerCase()) {
              addressLine2 = subregion;
            }

            parsedResult = {
              addressLine1,
              addressLine2,
              city,
              state: region,
              pincode: postalCode,
              country,
              latitude,
              longitude,
              isHouseNumberMissing,
              formattedAddress: (item as any).formattedAddress || undefined,
            };
          }
        } catch {
          // Native reverse geocode failed, will attempt fallback
        }
      }

      // If native geocoding returned empty (or running on Web)
      if (!parsedResult || (!parsedResult.city && !parsedResult.pincode && !parsedResult.addressLine1)) {
        parsedResult = await reverseGeocodeWebFallback(latitude, longitude);
      }

      if (!parsedResult) {
        return {
          success: false,
          error: 'Location was captured, but we could not resolve address details. Please enter your address manually.',
          errorCode: 'GEOCODE_FAILED',
        };
      }

      return {
        success: true,
        address: parsedResult,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown location error';
      return {
        success: false,
        error: `Could not fetch current location: ${msg}. Please enter your address manually.`,
        errorCode: 'UNAVAILABLE',
      };
    }
  },
};
