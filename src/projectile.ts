// Aqui estan el tamaño, color, estado y fisica del proyectil (la bala)
import { vec3 } from 'gl-matrix';

// COLORES Y MEDIDAS 
// esfera negra #0D0D0D 
export const BALL_COLOR: readonly [number, number, number, number] = [0x0d / 255, 0x0d / 255, 0x0d / 255, 1];

// radio de la bala, un poco más grande que el cañón (0.1) para que se vea
export const BALL_RADIUS = 0.15;

//FISICA
// Gravedad en m/s^2, solo actua en el eje Y (hacia abajo)
export const GRAVITY = -9.8;
// Velocidad de salida (m/s) para cada nivel de fuerza. El indice es el nivel (el 0 no se usa)
export const FORCES = [0, 9, 13, 17];

// ESTADO

// 'ready': la bala esta en la punta del cañon esperando el disparo
// 'flying': la bala va por el aire siguiendo la parabola
export type BallMode = 'ready' | 'flying';

export const ball = {
    mode: 'ready' as BallMode,
    position: vec3.create(), // donde esta la bala ahora (mundo)
    p0: vec3.create(),       // donde estaba al momento del disparo
    v0: vec3.create(),       // velocidad al momento del disparo
    t: 0,                    // segundos desde el disparo
};

//FUNCIONES

// Formula del tiro parabolico: p(t) = p0 + v0·t + 1/2g·t^2
// Solo depende de t (tiempo transcurrido), no de cuantos frames pasaron, por eso la bala cae en el mismo lugar a 30 o a 144 FPS
export function positionAt(out: vec3, p0: vec3, v0: vec3, t: number): vec3 {
    out[0] = p0[0] + v0[0] * t;                            // X: velocidad constante
    out[1] = p0[1] + v0[1] * t + 0.5 * GRAVITY * t * t;    // Y: la gravedad la frena y la baja
    out[2] = p0[2] + v0[2] * t;                            // Z: velocidad constante
    return out;
}

// Calcula la velocidad inicial, la direccion del cañon por la fuerza del nivel
export function launchVelocity(out: vec3, direction: vec3, power: number): vec3 {
    return vec3.scale(out, direction, FORCES[power]);
}

// Dispara, guarda el punto y la velocidad de salida, y reinicia el reloj
export function fire(direction: vec3, power: number): void {
    vec3.copy(ball.p0, ball.position);
    launchVelocity(ball.v0, direction, power);
    ball.t = 0;
    ball.mode = 'flying';
}

// Avanza el vuelo. Retorna true si la bala sigue en el aire
export function updateFlight(dt: number): boolean {
    ball.t += dt;
    positionAt(ball.position, ball.p0, ball.v0, ball.t);

    // Choque con el suelo, la parte de abajo de la bala toca y = 0
    if (ball.position[1] - BALL_RADIUS <= 0) {
        ball.mode = 'ready';
        return false;
    }
    return true;
}

//TRAYECTORIA
// Cuantos puntos como maximo tiene la linea, y cada cuanto tiempo se toma una muestra
export const TRAJECTORY_MAX_POINTS = 80;
const TRAJECTORY_STEP = 0.05; // segundos entre puntos (80 x 0.05 = 4 s de vuelo)

const sample = vec3.create();

// Llena "out" con los puntos (x, y, z) de la parabola que seguiria la bala
// Retorna cuantos puntos se escribieron. Se detiene al llegar al suelo
export function computeTrajectory(out: Float32Array, p0: vec3, v0: vec3): number {
    let count = 0;
    for (let i = 0; i < TRAJECTORY_MAX_POINTS; i++) {
        positionAt(sample, p0, v0, i * TRAJECTORY_STEP);
        out[count * 3 + 0] = sample[0];
        out[count * 3 + 1] = sample[1];
        out[count * 3 + 2] = sample[2];
        count++;
        if (sample[1] <= 0) break; // ya toco el suelo, no seguimos
    }
    return count;
}