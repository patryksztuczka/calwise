// Browser APIs shipped on some mobile devices but absent from TypeScript's DOM declarations.
// oxlint-disable-next-line unicorn/require-module-specifiers -- Global augmentation requires a module boundary.
export {};
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options: { formats: string[] }): {
        detect(image: HTMLCanvasElement): Promise<{ rawValue: string }[]>;
      };
      getSupportedFormats(): Promise<string[]>;
    };
  }
  interface MediaTrackCapabilities {
    focusMode?: string[];
    torch?: boolean;
    zoom?: { min: number; max: number; step: number };
  }
  interface MediaTrackConstraintSet {
    focusMode?: string;
    torch?: boolean;
    zoom?: number;
  }
  interface MediaTrackSettings {
    zoom?: number;
  }
}
