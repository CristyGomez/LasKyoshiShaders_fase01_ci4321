// Constantes y clases para crear mallas y dibujarlas
import { mat3, mat4 } from 'gl-matrix';
import type { Color, createFixedFunction } from './vendor/ff/ff';

import { ATTRIB, type FixedFunction } from './vendor/ff/ff'; // 

//============================== CONSTANTES ==============================

// Constantes que describen como estan estructurados los datos de cada vertice
// Cada vertice tiene 6 floats: 3 de posicion y 3 de normal.
export const FLOATS_PER_VERTEX = 6;
// Pasos de un vertice a otro en bytes
export const STRIDE_BYTES = FLOATS_PER_VERTEX * 4; 
// offset para la normal dentro de un vertice, en bytes
export const NORMAL_OFFSET_BYTES = 3 * 4;

const normalMatrix = mat3.create();

// ============================= CLASES ==============================

// Creador de mallas, permite agregar vertices y triangulos (en base a sus indices)
export class Mesh {

    vertices: number[] = [];
    triangle_indices: number[] = [];
    vertexCount = 0;
	vao: WebGLVertexArrayObject | null = null;

    // Agrega un vertice con su posicion y normal. Retorna el indice del vertice agregado.
    vertex(px: number, py: number, pz: number, nx: number, ny: number, nz: number): number {
        this.vertices.push(px, py, pz, nx, ny, nz);
        return this.vertexCount++;
    }

    // Agrega un triangulo con los indices de sus vertices.
    triangle(a: number, b: number, c: number): void {
        this.triangle_indices.push(a, b, c);
    }

	build(gl: WebGL2RenderingContext): void { 

		// VAO, Buffer de vertices y carga de datos en la GPU
		const vao = gl.createVertexArray()!;
  		gl.bindVertexArray(vao);

		const vertex_buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

		// atributos: posicion y normal
		gl.enableVertexAttribArray(ATTRIB.POSITION);
		gl.vertexAttribPointer(ATTRIB.POSITION, 3, gl.FLOAT, false, STRIDE_BYTES, 0);

		gl.enableVertexAttribArray(ATTRIB.NORMAL);
		gl.vertexAttribPointer(ATTRIB.NORMAL, 3, gl.FLOAT, false, STRIDE_BYTES, NORMAL_OFFSET_BYTES);

		// Buffer de indices y carga de datos en la GPU
		const index_buffer = gl.createBuffer()!;
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.triangle_indices), gl.STATIC_DRAW);
		gl.bindVertexArray(null);

		this.vao = vao;

	}

	draw(gl: WebGL2RenderingContext, ff: FixedFunction): void {
		gl.bindVertexArray(this.vao);
    	ff.drawElements(gl.TRIANGLES, this.triangle_indices.length, gl.UNSIGNED_SHORT, 0);	}
}

// ============================= FUNCIONES ==============================

/** Dibuja una malla con un color y una model matrix. */
export function drawPart(gl: WebGL2RenderingContext, 
						 ff: ReturnType<typeof createFixedFunction>, 
						 mesh: Mesh, 
						 model: mat4, 
						 color: Color): void {

  // el color de la pieza (ambiente y difuso iguales, como en el cubo).
  ff.setMaterial({ ambient: color, diffuse: color });

  // Con el modelo sabemos donde va la pieza en el mundo.
  ff.setModelMatrix(model);

  // matriz normal
  ff.setNormalMatrix(mat3.normalFromMat4(normalMatrix, model));

  // Dibujar
  mesh.draw(gl, ff);
}