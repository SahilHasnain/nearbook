import type { ApproximateCoordinates } from "@/context/auth";
import type { Listing } from "@/lib/types";

export function distanceBetweenMeters(
  from: ApproximateCoordinates,
  to: ApproximateCoordinates
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function distanceToListing(
  coordinates: ApproximateCoordinates | null,
  listing: Listing
): number | null {
  if (
    !coordinates ||
    typeof listing.locationLatitude !== "number" ||
    typeof listing.locationLongitude !== "number"
  ) {
    return null;
  }
  return distanceBetweenMeters(coordinates, {
    latitude: listing.locationLatitude,
    longitude: listing.locationLongitude,
  });
}

export function formatApproximateDistance(meters: number): string {
  if (meters < 1000) {
    const rounded = Math.max(100, Math.round(meters / 100) * 100);
    if (rounded >= 1000) return "~1 km away";
    return `~${rounded} m away`;
  }
  return `~${Math.max(1, Math.round(meters / 1000))} km away`;
}
