/** Share of the world visited, e.g. "5%". Shows "<1%" rather than "0%" once anything is visited. */
export function percentLabel(count: number, total: number) {
  const percent = (count / total) * 100
  return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`
}
