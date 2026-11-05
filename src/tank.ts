// Aqui estan las medidas, colores, piezas y transformaciones del tanque
// update usa estas matrices (la bala necesita la punta del cañón) y render las lee para dibujar.
import { mat4, vec3 } from 'gl-matrix';

type Vector3 = readonly [number, number, number];

//============================== COLORES ==============================

/** el tanque tanque sera gris oscuro #404045 para cuerpo, torreta y cañón. */
export const TANK_COLOR: readonly [number, number, number, number] = [0x40 / 255, 0x40 / 255, 0x45 / 255, 1];

/** Para algunos detalles usaremos gris más oscuro #262629 para orugas y escapes. */
export const DETAIL_COLOR: readonly [number, number, number, number] = [0x26 / 255, 0x26 / 255, 0x29 / 255, 1];

/** rojo para el emblem #BF1F14 para la media luna y la circunferencia. */
export const EMBLEM_COLOR: readonly [number, number, number, number] = [0xbf / 255, 0x1f / 255, 0x14 / 255, 1];

//==================== MEDIDAS DE LAS PARTES DEL TANQUE ==============================

// Cuerpo (un cubo) con ancho (x), alto (y), largo (z). El tanque mira hacia -Z.
export const BODY_SIZE: Vector3 = [1.6, 0.6, 2.2];

// Torreta (un cilindro acostado a lo largo de X) gira sobre su propio eje se ve igual en cualquier ángulo.
export const TURRET_RADIUS = 0.35;
export const TURRET_LENGTH = 1.0;

// Cañón (un cilindro) que sale de la torreta hacia -Z.
export const BARREL_RADIUS = 0.1;
export const BARREL_LENGTH = 1.4;

// Orugas (cajas largas y bajas a los lados del cuerpo).
export const TRACK_SIZE: Vector3 = [0.35, 0.5, 2.4];

// Escapes (cilindros verticales en las esquinas de atrás).
export const EXHAUST_RADIUS = 0.08;
export const EXHAUST_HEIGHT = 0.5;

// Emblema (media luna y circunferencia sobre el techo, detrás de la torreta).
export const CRESCENT_RADIUS = 0.25;
export const CRESCENT_WIDTH = 0.08;
export const EMBLEM_CIRCLE_RADIUS = 0.08;
export const EMBLEM_CIRCLE_HEIGHT = 0.01;

// Elevación del cañón en grados (Esto es fijo del enunciado).
export const MIN_ELEVATION = 5;
export const MAX_ELEVATION = 90;

//============================== NIVELES DE FUERZA ==============================

// Colores del indicador de fuerza.
// verde claro #6BE05A
export const POWER_ON_COLOR: readonly [number, number, number, number] = [0x6b / 255, 0xe0 / 255, 0x5a / 255, 1];
// verde oscuro #1F4A1C
export const POWER_OFF_COLOR: readonly [number, number, number, number] = [0x1f / 255, 0x4a / 255, 0x1c / 255, 1];

// barras en la cara de atras del cuerpo 
export const POWER_LEVELS = 3;
export const POWER_BAR_SIZE: Vector3 = [0.5, 0.08, 0.02];
// espc=acio entre las barras
const POWER_BAR_GAP = 0.04;

const POWER_BAR_Z = BODY_SIZE[2] / 2 + POWER_BAR_SIZE[2] / 2;
// distancia de una barra a la siguiente
const POWER_BAR_STEP = POWER_BAR_SIZE[1] + POWER_BAR_GAP; 

// Posicio de cada barra respecto al centro del cuerpo
export const POWER_BAR_OFFSETS: readonly Vector3[] = [
  [0, -POWER_BAR_STEP, POWER_BAR_Z], // abajo
  [0, 0, POWER_BAR_Z], // medio
  [0, POWER_BAR_STEP, POWER_BAR_Z], // arriba
];

//============================== PIEZAS FIJAS AL CUERPO ==============================

// Calculamos la mitad de las dimensiones del cuerpo para colocar las piezas respecto a su centro.
const BODY_HALF_W = BODY_SIZE[0] / 2;
const BODY_HALF_H = BODY_SIZE[1] / 2;

// Las orugas se meten un poco en el cuerpo de forma horizontal para que no quede una rendija entre ambos.
const TRACK_X = BODY_HALF_W + TRACK_SIZE[0] / 2 - 0.025;
const TRACK_Y = TRACK_SIZE[1] / 2 - BODY_HALF_H;

// Los escapes se apoyan sobre el techo.
const EXHAUST_Y = BODY_HALF_H + EXHAUST_HEIGHT / 2;

// Mallas que puede usar una pieza fija. Sus nombres deben existir en createMeshes.
export type BodyPartMesh = 'track' | 'exhaust';

// Deberiamos agregar el nombre de cada pieza?
// Piezas que van pegadas al cuerpo del tanque: su malla y donde van respecto al centro del cuerpo del tanque. 
export const BODY_PARTS: readonly { mesh: BodyPartMesh; offset: Vector3 }[] = [
    { mesh: 'track',   offset: [-TRACK_X, TRACK_Y, 0] },    // oruga izquierda
    { mesh: 'track',   offset: [TRACK_X, TRACK_Y, 0] },     // oruga derecha
    { mesh: 'exhaust', offset: [-0.6, EXHAUST_Y, 0.9] },    // escape trasero izquierdo
    { mesh: 'exhaust', offset: [0.6, EXHAUST_Y, 0.9] },     // escape trasero derecho
];

// el emblema va apenas por encima del techo para evitar el z-fighting.
const EMBLEM_Y = BODY_HALF_H + 0.005;
const EMBLEM_Z = 0.6;
export const CRESCENT_OFFSET: Vector3 = [0, EMBLEM_Y, EMBLEM_Z];
// La circunferencia va dentro del hueco de la media luna, separada de ella.
export const EMBLEM_CIRCLE_OFFSET: Vector3 = [0, EMBLEM_Y, EMBLEM_Z + 0.06];

//============================== MATRICES ==============================

const DEG = Math.PI / 180;

// Matrices de cada pieza. Se crean una vez y se recalculan en cada frame. 
export const tank_m = {
    base: mat4.create(),        // cuerpo
    turretPivot: mat4.create(), // pivote de la torreta, para girar el cañon y la torreta juntos )?
    turret: mat4.create(),      // torreta
    barrel: mat4.create(),      // cañon
};

// OJO HAY QUE REVISAR 
// Funcion que actualiza las matrices de cada pieza del tanque siguiendo una jerarquia de transformaciones
// 1. Cuerpo 2. Pivote de la torreta 3. Torreta 4. Cañon
export function updateTankMatrices(new_posX: number, elevationDeg: number): void {

    // El cuerpo solo se desplaza de forma horzontal (en X)
    mat4.fromTranslation(tank_m.base, [new_posX, BODY_HALF_H, 0]);

    // Pivote de la torreta
    mat4.translate(tank_m.turretPivot, tank_m.base, [0, BODY_HALF_H + TURRET_RADIUS, 0]);
    mat4.rotateX(tank_m.turretPivot, tank_m.turretPivot, elevationDeg * DEG);

    // Para la torreta hacemos un cilindro vertical y lo acostamos a lo largo de X (creo)
    mat4.rotateZ(tank_m.turret, tank_m.turretPivot, Math.PI / 2);

    // Cañon se acuesta hacia -Z y lo adelantamos media longitud,
    // para que su base quede en el pivote y gire desde ahí.
    mat4.rotateX(tank_m.barrel, tank_m.turretPivot, -Math.PI / 2);
    mat4.translate(tank_m.barrel, tank_m.barrel, [0, BARREL_LENGTH / 2, 0]);
}

// Punta del cañón en coordenadas del mundo: ahi va la bala
export function barrelTip(out: vec3): vec3 {
    // En el espacio local del cilindro, la punta está en +Y, a media longitud del centro.
    return vec3.transformMat4(out, [0, BARREL_LENGTH / 2, 0], tank_m.barrel);
}

// Base del cañón en coordenadas del mundo (el extremo pegado a la torreta).
const barrelBase = vec3.create();

// Dirección hacia donde apunta el cañón, en el mundo y de largo 1
// Es la resta punta - base, normalizada
export function barrelDirection(out: vec3): vec3 {
    vec3.transformMat4(barrelBase, [0, -BARREL_LENGTH / 2, 0], tank_m.barrel);
    barrelTip(out);
    vec3.subtract(out, out, barrelBase);
    return vec3.normalize(out, out);
}