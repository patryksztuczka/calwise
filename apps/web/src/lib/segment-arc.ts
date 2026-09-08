/** A clockwise SVG arc around a square's center. Angles start at the right and increase counter-clockwise. */
export function segmentArc(center: number, radius: number, from: number, sweep: number): string {
  function point(angleDegrees: number): string {
    const angle = (angleDegrees * Math.PI) / 180;
    return `${(center + radius * Math.cos(angle)).toFixed(2)} ${(center - radius * Math.sin(angle)).toFixed(2)}`;
  }
  return `M ${point(from)} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 1 ${point(from - sweep)}`;
}
