// Scene constants: geometry, colors and canvas settings. main.ts holds the WebGL code and the game loop.

/** Sky color (Background color) #8EC5E8 as floats in [0, 1]. */
export const CLEAR_COLOR: readonly [number, number, number, number] = [0x8e / 255, 0xc5 / 255, 0xe8 / 255, 1];

/** Suelo constantes - color arcilla rojiza #9A5F3E */
export const GROUND_COLOR: readonly [number, number, number, number] = [0.60, 0.37, 0.24, 1];
export const GROUND_WIDTH = 40; // x
export const GROUND_DEPTH = 60; // z

/** Cámara: fija, detrás y por encima del tanque, mirando hacia los objetivo. Provisional. */
export const CAMERA_EYE: readonly [number, number, number] = [0, 4, 8]; // Dnde está la camara
export const CAMERA_TARGET: readonly [number, number, number] = [0, 0, -10]; // hacia donde mira

/** Drawing buffer size in pixels, 4:3. CSS scales the canvas to fit the window; the buffer stays fixed. */
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;



export const STRIDE_BYTES = 6 * 4; // 4 bytes per float (Float32)
export const NORMAL_OFFSET_BYTES = 3 * 4;
