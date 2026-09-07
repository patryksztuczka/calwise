import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { startCamera } from "./camera";

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.unstubAllGlobals();
});

function setup() {
  const track = Object.assign(new EventTarget(), {
    stop: vi.fn(),
    getCapabilities: () => ({ focusMode: ["continuous"] }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
  });
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  const detect = vi.fn().mockResolvedValue([{ rawValue: "3017620422003" }]);
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }) };
  const document = Object.assign(new EventTarget(), { hidden: false, createElement: () => canvas });
  vi.stubGlobal("document", document);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.stubGlobal("window", {
    isSecureContext: true,
    BarcodeDetector: class {
      static async getSupportedFormats() {
        return ["ean_13", "ean_8", "upc_a"];
      }
      detect = detect;
    },
  });
  const videoStub: Partial<HTMLVideoElement> = {
    srcObject: null,
    play: vi.fn().mockResolvedValue(undefined),
    videoWidth: 1920,
    videoHeight: 1080,
    readyState: 2,
  };
  // SAFETY: The video stub supplies every member used by startCamera; canvas drawing is mocked above.
  const video = videoStub as HTMLVideoElement;
  const callbacks = { ready: vi.fn(), result: vi.fn(), error: vi.fn() };
  return { track, stream, getUserMedia, detect, document, video, callbacks };
}

describe("camera lifecycle", () => {
  it("reads one valid code and releases the camera immediately", async () => {
    const fixture = setup();
    cleanup = startCamera(fixture.video, fixture.callbacks);
    await vi.waitFor(() => expect(fixture.callbacks.result).toHaveBeenCalledOnce());
    expect(fixture.callbacks.result).toHaveBeenCalledWith(
      expect.objectContaining({ code: "3017620422003", engine: "Native" }),
    );
    expect(fixture.track.stop).toHaveBeenCalledOnce();
    expect(fixture.video.srcObject).toBeNull();
    expect(fixture.callbacks.error).not.toHaveBeenCalled();
  });
  it("releases a stream even if permission arrives after closing the scanner", async () => {
    const fixture = setup();
    const media = Promise.withResolvers<typeof fixture.stream>();
    fixture.getUserMedia.mockReturnValue(media.promise);
    cleanup = startCamera(fixture.video, fixture.callbacks);
    await vi.waitFor(() => expect(fixture.getUserMedia).toHaveBeenCalledOnce());
    cleanup();
    media.resolve(fixture.stream);
    await vi.waitFor(() => expect(fixture.track.stop).toHaveBeenCalledOnce());
    expect(fixture.callbacks.ready).not.toHaveBeenCalled();
    expect(fixture.callbacks.result).not.toHaveBeenCalled();
    expect(fixture.video.srcObject).toBeNull();
  });
  it("reports denied camera permission", async () => {
    const fixture = setup();
    fixture.getUserMedia.mockRejectedValue(new DOMException("Denied", "NotAllowedError"));
    cleanup = startCamera(fixture.video, fixture.callbacks);
    await vi.waitFor(() =>
      expect(fixture.callbacks.error).toHaveBeenCalledWith(expect.stringContaining("Zezwól")),
    );
    expect(fixture.callbacks.result).not.toHaveBeenCalled();
  });
  it("stops on backgrounding and ignores an in-flight decode result", async () => {
    const fixture = setup();
    const decode = Promise.withResolvers<{ rawValue: string }[]>();
    fixture.detect.mockReturnValue(decode.promise);
    cleanup = startCamera(fixture.video, fixture.callbacks);
    await vi.waitFor(() => expect(fixture.detect).toHaveBeenCalledOnce());
    fixture.document.hidden = true;
    fixture.document.dispatchEvent(new Event("visibilitychange"));
    expect(fixture.track.stop).toHaveBeenCalledOnce();
    decode.resolve([{ rawValue: "3017620422003" }]);
    await decode.promise;
    expect(fixture.callbacks.result).not.toHaveBeenCalled();
    expect(fixture.callbacks.error).toHaveBeenCalledWith(expect.stringContaining("wstrzymane"));
  });
});
