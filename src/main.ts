// Rotating cube, FixedFunction (FF) version.
import './style.css';
import {  mat4, vec3} from 'gl-matrix';
import {  createFixedFunction, LIGHTING } from './vendor/ff/ff';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CLEAR_COLOR,

//   NORMAL_OFFSET_BYTES,
//   STRIDE_BYTES,

  GROUND_COLOR,
  GROUND_WIDTH,
  GROUND_DEPTH,

  CAMERA_EYE,
  CAMERA_TARGET,

} from './constants';

import { createPlane, createBox, createCylinder, createCrescent, createSphere } from './primitives';
import { Mesh, drawPart } from './mesh';

import {
		tank_m, 
		updateTankMatrices,
		barrelTip, 
		barrelDirection,
		BODY_PARTS,
		BODY_SIZE,
		TURRET_RADIUS, TURRET_LENGTH,
		BARREL_RADIUS, BARREL_LENGTH,
		TRACK_SIZE,
		EXHAUST_RADIUS, EXHAUST_HEIGHT,
		CRESCENT_RADIUS, CRESCENT_WIDTH,
		EMBLEM_CIRCLE_RADIUS, EMBLEM_CIRCLE_HEIGHT,
		TANK_COLOR,
		DETAIL_COLOR,
		EMBLEM_COLOR,
		CRESCENT_OFFSET,
		EMBLEM_CIRCLE_OFFSET,
		POWER_BAR_SIZE,
		POWER_LEVELS,
		POWER_BAR_OFFSETS,
		POWER_ON_COLOR,
		POWER_OFF_COLOR
} from './tank';
import { resetTargets, TARGET_COLOR, TARGET_RADIUS, targets } from './targets';
import {
		ball, BALL_COLOR, BALL_RADIUS,
		fire, updateFlight,
		launchVelocity, computeTrajectory, TRAJECTORY_MAX_POINTS,
} from './projectile';
import { TrajectoryLine, TRAJECTORY_COLOR } from './trajectory';

// ============================== TIPOS ==============================
type FF = ReturnType<typeof createFixedFunction>;


// ============================== INTERFACES  ==============================
interface Meshes {
	// Suelo
	ground: Mesh;

	// Tanque
	body: Mesh;
	turret: Mesh;
	barrel: Mesh;

	// Piezas fijas al cuerpo
	track: Mesh;
	exhaust: Mesh;

	// Emblema
	crescent: Mesh;
	emblemCircle: Mesh;

	powerBar: Mesh;
	target: Mesh;
	ball: Mesh;

}

// ============================== CONSTANTES ==============================

const MAX_DT = 0.1; // seconds

// maitrz identidad
const identity = mat4.create();
// se reutiliza para las piezas fijas al cuerpo
const partMatrix = mat4.create();  

// Limites horizontales para el tanque (Ojo, si cambiamos la camara es posible que tengamos que modificar esto)
const MAX_X = 3.5
const MIN_X = -3.5 

// Velocidad del tanque
const TANK_SPEED = 3

// limites del cañon
const MIN_ELEVATION = 5
const MAX_ELEVATION = 90

// no se si esto funcione
const ELEVATION_SPEED = 45;

// ============================== FUNCIONES ==============================

// Step 1. Get the WebGL2 context.
function getContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2');
  if (!gl) throw new Error('WebGL2 is not available.');
  return gl;
}

// // Step 2. Shaders and program: FF creates and owns them.
// // Step 3. Vertex specification: copy the vertex and index data to the GPU.
// function createVertexBuffer(gl: WebGL2RenderingContext, data: Float32Array): WebGLBuffer {
//   const buffer = gl.createBuffer()!;
//   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//   gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
//   return buffer;
// }

// function createIndexBuffer(gl: WebGL2RenderingContext, data: Uint16Array): WebGLBuffer {
//   const buffer = gl.createBuffer()!;
//   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
//   gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
//   return buffer;
// }

// // Step 4. Describe how the vertex data is laid out, using FF's attribute slots.
// // No ATTRIB.COLOR: lit colors come from the material.
// function createVAO(gl: WebGL2RenderingContext, vertices: WebGLBuffer, indices: WebGLBuffer): WebGLVertexArrayObject {
//   const vao = gl.createVertexArray()!;
//   gl.bindVertexArray(vao);
//   gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
//   gl.enableVertexAttribArray(ATTRIB.POSITION);
//   gl.vertexAttribPointer(ATTRIB.POSITION, 3, gl.FLOAT, false, STRIDE_BYTES, 0);
//   gl.enableVertexAttribArray(ATTRIB.NORMAL);
//   gl.vertexAttribPointer(ATTRIB.NORMAL, 3, gl.FLOAT, false, STRIDE_BYTES, NORMAL_OFFSET_BYTES);
//   // The VAO remembers the ELEMENT_ARRAY_BUFFER bound while it is bound.
//   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
//   gl.bindVertexArray(null);
//   return vao;
// }

// Step 5. Pipeline state: canvas size, viewport, clear color, depth test, face culling.
function setupState(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement): void {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(...CLEAR_COLOR);
  gl.enable(gl.DEPTH_TEST); // new vs. the triangle: nearer faces must hide farther ones
  gl.enable(gl.CULL_FACE); // skip back faces; front faces are counter-clockwise (the default)
}

// Step 6. Scene: lighting, one directional light, camera.
function setupScene(ff: FF): void {
	ff.enable(LIGHTING);
	ff.setGlobalAmbient([0.2, 0.2, 0.2, 1]); // the FF default, set explicitly to make it visible

	// The light TRAVELS in direction (-1, -1, -0.5): down, left, slightly away from the camera.
	// FF's position (w = 0) points TOWARD the light, so the sign flips: (1, 1, 0.5, 0).
	// Passing the travel direction instead lights the faces that point away from the light.
	ff.setLight(0, { position: [1, 1, 0.5, 0], diffuse: [1, 0.95, 0.85, 1] });
	ff.enableLight(0);

	// Provisional	
	const view = mat4.lookAt(mat4.create(), CAMERA_EYE, CAMERA_TARGET, [0, 1, 0]);
	ff.setViewMatrix(view);
	// Aspect = width / height of the drawing buffer (4:3). A wrong aspect stretches the cube.
	const projection = mat4.perspective(mat4.create(), Math.PI / 4, CANVAS_WIDTH / CANVAS_HEIGHT, 0.1, 100);
	ff.setProjectionMatrix(projection);
}

// ---------------------------------------------------------------------------
// Game loop. Every frame does three separate phases:
//   1. processInput: read what the user did.
//   2. update(dt): advance the simulation by the elapsed time dt.
//   3. render: draw the current state.
// Keep the phases apart: render never changes the state, and update never calls WebGL.
// ---------------------------------------------------------------------------

//=================================== ESTADO DEL JUEGO ==================================================

// Game state: everything the simulation needs, nothing about WebGL.
const state = { posX: 0, elevation: 30, power: 1, fire: false };

// Vectores de apoyo para apuntar. Se crean una vez y se reutilizan cada frame.
const aimDirection = vec3.create(); // hacia donde apunta el cañon (largo 1)
const aimStart = vec3.create();     // punta del cañon
const aimVelocity = vec3.create();  // velocidad que tendria la bala si disparamos ahora
 
// Puntos de la linea de trayectoria (x, y, z por punto) y cuantos se usan.
const trajectoryPoints = new Float32Array(TRAJECTORY_MAX_POINTS * 3);
let trajectoryCount = 0;

//=================================== ENTRADA POR TECLADO ===============================================

// Input: the keydown listener only records presses. processInput handles them later, once per frame.
let spacePressed = false;

let rPressed = false;
let fPressed = false;

let d1Pressed = false;
let d2Pressed = false;
let d3Pressed = false;

let upPressed = false;
let downPressed = false;
let leftPressed = false;
let rightPressed = false;


function setupInput(): void {
	window.addEventListener('keydown', (e) => {

		if (e.code === 'Space') e.preventDefault(); // stops the page from scrolling

		if (e.code === 'Space') spacePressed = true;

		if (e.code === 'ArrowLeft') leftPressed = true;
		if (e.code === 'ArrowRight') rightPressed = true;
		if (e.code === 'ArrowUp') upPressed = true;
		if (e.code === 'ArrowDown') downPressed = true;

		if (e.repeat) return; // holding a key counts as one press

		if (e.code === 'KeyR') rPressed = true;
		if (e.code === 'KeyF') fPressed = true;

		if (e.code === 'Digit1' || e.code === 'Numpad1') d1Pressed = true;
		if (e.code === 'Digit2'|| e.code === 'Numpad2') d2Pressed = true;
		if (e.code === 'Digit3' || e.code === 'Numpad3') d3Pressed = true;
		
	});

	window.addEventListener('keyup', (e) => {
		if (e.code === 'ArrowLeft') leftPressed = false;
		if (e.code === 'ArrowRight') rightPressed = false;
		if (e.code === 'ArrowUp') upPressed = false;
		if (e.code === 'ArrowDown') downPressed = false;
	});
	// Research: key-state polling with edge detection. Store which keys are down, and compare with
	// the last frame: pressed = down now && !down last frame. When does it fit better than events?
}

function clearInput(): void {
	spacePressed = false;

	rPressed = false;
	fPressed = false;

	d1Pressed = false;
	d2Pressed = false;
	d3Pressed = false;

}

// Loop phase 1. Space selects the next color. R toggles the rotation.
// Each flag is cleared after use, so each press counts once.
//
function processInput(): void {

	if (d1Pressed) state.power = 1;
	if (d2Pressed) state.power = 2;
	if (d3Pressed) state.power = 3;
	if (fPressed) state.power = (state.power % 3) + 1; 

	if (spacePressed) state.fire = true; 
	if (rPressed) resetGame();
}

function resetGame(): void {
	state.posX = 0;
	state.elevation = 30;
	state.power = 1;
	state.fire = false;
	ball.mode = 'ready';
	resetTargets();
}
// Loop phase 2. 
function update(dt: number): void {

	// Movimiento horizontal, limitado entre MIN_X y MAX_X.
	if (leftPressed) state.posX -= TANK_SPEED * dt;
	if (rightPressed) state.posX += TANK_SPEED * dt;

	if (state.posX < MIN_X) state.posX = MIN_X 
	if (state.posX > MAX_X) state.posX = MAX_X 

	// cañon elevacion
	if (upPressed) state.elevation += ELEVATION_SPEED * dt;
	if (downPressed) state.elevation -= ELEVATION_SPEED * dt;

	if (state.elevation < MIN_ELEVATION) state.elevation = MIN_ELEVATION 
	if (state.elevation > MAX_ELEVATION) state.elevation = MAX_ELEVATION 

	updateTankMatrices(state.posX, state.elevation);
	// Direccion del cañon en este frame (la usan el disparo y la trayectoria)
	barrelDirection(aimDirection);
 
	// ----- Proyectil -----
	if (ball.mode === 'ready') {
		// En reposo: la bala acompaña la punta del cañon.
		barrelTip(ball.position);
 
		// Espacio: solo dispara si la bala esta disponible.
		if (state.fire) fire(aimDirection, state.power);
	}
 
	if (ball.mode === 'flying') {
		// Si toco el suelo vuelve a 'ready', y la ponemos en la punta este mismo frame
		if (!updateFlight(dt)) barrelTip(ball.position);
	}
	state.fire = false; // el disparo se consume, haya salido o no
 
	// ----- Trayectoria (vista previa) -----
	// Misma formula que el vuelo, desde la punta del cañon con la fuerza actual
	barrelTip(aimStart);
	launchVelocity(aimVelocity, aimDirection, state.power);
	trajectoryCount = computeTrajectory(trajectoryPoints, aimStart, aimVelocity);
	clearInput() 

}

// Loop phase 3. Draw the current state. render reads the state and never changes it.
// setMaterial runs every frame, so FF re-uploads the material each frame. That costs a few
// uniforms and keeps render simple. Exercise: set the material only when colorIndex changes.
// const model = mat4.create();
// const normalMatrix = mat3.create();

function render(gl: WebGL2RenderingContext, ff: FF, meshes: Meshes, trajectory: TrajectoryLine): void {
	
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Suelo
  	drawPart(gl, ff, meshes.ground, identity, GROUND_COLOR);

	// Tanque
	drawPart(gl, ff, meshes.body, 	tank_m.base,   TANK_COLOR);
	drawPart(gl, ff, meshes.turret, tank_m.turret, TANK_COLOR);
	drawPart(gl, ff, meshes.barrel, tank_m.barrel, TANK_COLOR);

	// Esto tal vez deberiamos ver si va en otra parte
	// Orugas y escapes del tanque
	for (const part of BODY_PARTS) {
		mat4.translate(partMatrix, tank_m.base, part.offset);
		drawPart(gl, ff, meshes[part.mesh], partMatrix, DETAIL_COLOR);
	}

	// Emblema sobre el techo
	mat4.translate(partMatrix, tank_m.base, CRESCENT_OFFSET);
	drawPart(gl, ff, meshes.crescent, partMatrix, EMBLEM_COLOR);
	mat4.translate(partMatrix, tank_m.base, EMBLEM_CIRCLE_OFFSET);
	drawPart(gl, ff, meshes.emblemCircle, partMatrix, EMBLEM_COLOR);

	// Indicador de fuerza
	for (let i = 0; i < POWER_LEVELS; i++) {
		// lo movemos con la base del tanque
		mat4.translate(partMatrix, tank_m.base, POWER_BAR_OFFSETS[i]);
		// escogemos el color dependiendo de si el nivel de fuerza esta activo o no
		const color = i < state.power ? POWER_ON_COLOR : POWER_OFF_COLOR;
		drawPart(gl, ff, meshes.powerBar, partMatrix, color);
	}

	// Objetivos los que siguen vivos.
	for (const target of targets) {
		if (!target.alive) continue;
		mat4.fromTranslation(partMatrix, target.position);
		drawPart(gl, ff, meshes.target, partMatrix, TARGET_COLOR);
	}

	// Proyectil
	mat4.fromTranslation(partMatrix, ball.position);
	drawPart(gl, ff, meshes.ball, partMatrix, BALL_COLOR);

	// Trayectoria, subimos los puntos calculados en update y dibujamos la linea
	trajectory.update(gl, trajectoryPoints, trajectoryCount);
	trajectory.draw(gl, ff, TRAJECTORY_COLOR);
}

function run(canvas: HTMLCanvasElement): void {
	
	//========= CONSTANTES =========
    const gl = getContext(canvas);
    const ff = createFixedFunction(gl, { debug: true });
	

    // Vamos a crear nuestras mallas las cuales vamos a reutilizar en cada frameal
	// Luego lo pasamos a una funcion
	const meshes = {
		// Suelo de la escena
		ground: createPlane(gl, GROUND_WIDTH, GROUND_DEPTH),

		// Tanque
		body: createBox(gl, ...BODY_SIZE),
		turret: createCylinder(gl, TURRET_RADIUS, TURRET_LENGTH),
		barrel: createCylinder(gl, BARREL_RADIUS, BARREL_LENGTH),

		// Detalles del tanque
		track: createBox(gl, ...TRACK_SIZE),
		exhaust: createCylinder(gl, EXHAUST_RADIUS, EXHAUST_HEIGHT),

		// Emblema del tanque
		crescent: createCrescent(gl, CRESCENT_RADIUS, CRESCENT_WIDTH),
		emblemCircle: createCylinder(gl, EMBLEM_CIRCLE_RADIUS, EMBLEM_CIRCLE_HEIGHT),

		// Indicador de fuerza
		powerBar: createBox(gl, ...POWER_BAR_SIZE),

		// Poryectiles
		target: createSphere(gl, TARGET_RADIUS),
		ball: createSphere(gl, BALL_RADIUS),
	}

	const trajectory = new TrajectoryLine(gl, TRAJECTORY_MAX_POINTS);

	setupState(gl, canvas);
    setupScene(ff);
    setupInput();

    let last: number | null = null; // set by the first frame, so dt starts at 0
    function frame(now: number): void {
		if (last === null) last = now;
		// rAF pauses in hidden tabs. On return, (now - last) would be huge, so cap dt.
		const dt = Math.min((now - last) / 1000, MAX_DT);
		last = now;
		processInput();
		update(dt);
		render(gl, ff, meshes, trajectory);
		requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// Page scaffolding: create the canvas and start the cube.
const canvas = document.createElement('canvas');
document.getElementById('stage')!.append(canvas);
run(canvas);
