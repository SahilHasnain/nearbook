import * as Location from "expo-location";

export interface DetectedLocation {
  label: string;
  latitude: number;
  longitude: number;
}

function approximateCoordinates(latitude: number, longitude: number) {
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { latitude: round(latitude), longitude: round(longitude) };
}

/** Requests foreground location and resolves it to an area-level address, not coordinates. */
export async function requestApproximateCity(): Promise<DetectedLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error("Location permission was not granted.");
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const [address] = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  const locationParts = [
    address?.district,
    address?.city,
    address?.subregion,
    address?.region,
    address?.postalCode,
  ].filter((part): part is string => Boolean(part?.trim()));
  const uniqueParts = locationParts.filter(
    (part, index) => locationParts.findIndex((candidate) => candidate.toLowerCase() === part.toLowerCase()) === index
  );
  if (!uniqueParts.length) throw new Error("Could not determine an area from your location.");
  // Coarsen coordinates before saving/sharing so distance is approximate and
  // never exposes a precise device or home location.
  return {
    label: uniqueParts.join(", "),
    ...approximateCoordinates(position.coords.latitude, position.coords.longitude),
  };
}
