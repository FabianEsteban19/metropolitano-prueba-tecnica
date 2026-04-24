const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineDistanceMeters(
  origin: { latitud: number; longitud: number },
  target: { latitud: number; longitud: number },
) {
  const dLat = toRadians(target.latitud - origin.latitud);
  const dLng = toRadians(target.longitud - origin.longitud);
  const lat1 = toRadians(origin.latitud);
  const lat2 = toRadians(target.latitud);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
