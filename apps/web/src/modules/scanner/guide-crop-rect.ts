interface Viewport {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface VideoGeometry {
  readonly width: number;
  readonly height: number;
  readonly viewport: Viewport;
}

/** Map viewport coordinates into camera pixels for a centered object-cover video. */
export function guideCropRect(video: VideoGeometry, guide: Viewport) {
  const view = video.viewport;
  const scale = Math.max(view.width / video.width, view.height / video.height);
  return {
    x: (video.width - view.width / scale) / 2 + (guide.left - view.left) / scale,
    y: (video.height - view.height / scale) / 2 + (guide.top - view.top) / scale,
    width: guide.width / scale,
    height: guide.height / scale,
  };
}
