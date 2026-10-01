/** "23.4°N · 58.0°E", with longitudes turned into -180°…180° */
export function formatLatLng(lat: number, lng: number) {
  const east = ((((lng + 180) % 360) + 360) % 360) - 180
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(1)}°${value < 0 ? negative : positive}`
  return `${part(lat, 'N', 'S')} · ${part(east, 'E', 'W')}`
}
