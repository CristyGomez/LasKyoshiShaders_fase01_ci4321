// Aqui estan los tamaños y colores de os objetivos

//aranja rojizo #E04A1A.
export const TARGET_COLOR: readonly [number, number, number, number] = [0xe0 / 255, 0x4a / 255, 0x1a / 255, 1];

// o bastante grandes para poder acertar. 
export const TARGET_RADIUS = 0.6;


// un objetivo donde esta y si sigue vivo
export interface Target {
  position:  readonly [number, number, number];
  alive: boolean;
}

/** Los objetivos del juego. Un objetivo alcanzado pasa a alive = false y deja de dibujarse. */
// PROVISIONAL: cada uno a distinta profundidad (z) y altura (y).
export const targets: Target[] = [
    { position: [-4.5, 3.5, -7], alive: true }, 
    { position: [0, 4.5, -15], alive: true }, 
    { position: [6, 6.5, -25], alive: true }, 
];

/** Hace reaparecer los tres objetivos (para la tecla R). */
export function resetTargets(): void {
  for (const target of targets) target.alive = true;
}
