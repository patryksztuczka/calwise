import { describe, expect, it } from "vite-plus/test";
import { guideCropRect } from "../guide-crop-rect";

describe("guideCropRect", () => {
  it("crops a landscape camera feed to the guide in a portrait viewport", () => {
    expect(
      guideCropRect(
        { width: 1200, height: 600, viewport: { left: 20, top: 100, width: 300, height: 600 } },
        { left: 50, top: 300, width: 240, height: 200 },
      ),
    ).toEqual({ x: 480, y: 200, width: 240, height: 200 });
  });

  it("crops a portrait camera feed to the guide in a landscape viewport", () => {
    expect(
      guideCropRect(
        { width: 600, height: 1200, viewport: { left: 20, top: 100, width: 600, height: 300 } },
        { left: 120, top: 150, width: 400, height: 200 },
      ),
    ).toEqual({ x: 100, y: 500, width: 400, height: 200 });
  });

  it("scales a guide into source pixels when the aspect ratios match", () => {
    expect(
      guideCropRect(
        { width: 1200, height: 800, viewport: { left: 20, top: 100, width: 600, height: 400 } },
        { left: 70, top: 175, width: 400, height: 200 },
      ),
    ).toEqual({ x: 100, y: 150, width: 800, height: 400 });
  });

  it("uses relative positions even when the viewport is scrolled above the screen", () => {
    expect(
      guideCropRect(
        { width: 1200, height: 800, viewport: { left: 20, top: -100, width: 600, height: 400 } },
        { left: 70, top: -25, width: 400, height: 200 },
      ),
    ).toEqual({ x: 100, y: 150, width: 800, height: 400 });
  });
});
