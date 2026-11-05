// Linea que muestra la parabola que seguira la bala
// A diferencia de Mesh, sus datos cambian en cada frame, por eso usa DYNAMIC_DRAW
import { mat4 } from 'gl-matrix';
import { ATTRIB, LIGHTING, type Color, type FixedFunction } from './vendor/ff/ff';

// amarillo claro #FFE680, se distingue del cielo y del suelo
export const TRAJECTORY_COLOR: readonly [number, number, number, number] = [1, 0xe6 / 255, 0x80 / 255, 1];

const identity = mat4.create();

export class TrajectoryLine {
    private vao: WebGLVertexArrayObject;
    private buffer: WebGLBuffer;
    private count = 0;

    constructor(gl: WebGL2RenderingContext, maxPoints: number) {
        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        // Reservamos espacio para maxPoints puntos
        this.buffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxPoints * 3 * 4, gl.DYNAMIC_DRAW);

        // Solo posicion, una linea sin iluminacion no necesita normales
        gl.enableVertexAttribArray(ATTRIB.POSITION);
        gl.vertexAttribPointer(ATTRIB.POSITION, 3, gl.FLOAT, false, 3 * 4, 0);

        gl.bindVertexArray(null);
    }

    // Sube los puntos nuevos a la GPU (sin crear un buffer nuevo, solo reescribe el existente)
    update(gl: WebGL2RenderingContext, points: Float32Array, count: number): void {
        this.count = count;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, points, 0, count * 3);
    }

    draw(gl: WebGL2RenderingContext, ff: FixedFunction, color: Color): void {
        if (this.count < 2) return;

        // Sin luz, el color sale directo de setColor, igual en toda la linea
        ff.disable(LIGHTING);
        ff.setColor(color);
        ff.setModelMatrix(identity); // los puntos ya estan en coordenadas del mundo

        gl.bindVertexArray(this.vao);
        ff.drawArrays(gl.LINE_STRIP, 0, this.count);

        // Dejamos la luz como estaba para el resto de la escena
        ff.enable(LIGHTING);
    }
}