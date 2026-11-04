// Generador de primitivas, se retornan datos de malla centrados en el origen. 
import { Mesh } from './mesh' ;

//============================== TIPOS ==============================

type Vector3 = readonly [number, number, number];

//============================== FUNCIONES ==========================

// Funcion para crear un cubo de tamaño width (x) x height (y) x depth (z), se escriben las caras una por una como el cubo original.
export function createBox(gl: WebGL2RenderingContext, width: number, height: number, depth: number): Mesh {

    const box = new Mesh();

    // Se calcula la mitad de cada dimension para centrar el cubo en el origen.
    const x = width  / 2;
    const y = height / 2;
    const z = depth  / 2;

    // Para cada cara, se crean 4 vertices con la misma normal y 2 triangulos: (0, 1, 2) y (0, 2, 3).
    function face(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, n: Vector3): void {
        
        // Guardamos cada vertice y su normal, y obtenemos el indice del primer vertice para crear los triangulos.
        const first_index = box.vertex(...p0, ...n);
        box.vertex(...p1, ...n);
        box.vertex(...p2, ...n);
        box.vertex(...p3, ...n);

        // Creamos los dos triangulos de la cara usando los indices de los vertices.
        box.triangle(first_index, first_index + 1, first_index + 2);
        box.triangle(first_index, first_index + 2, first_index + 3);
    }

    // Creamos las 6 caras del cubo, cada una con su normal correspondiente.
    face([-x, -y, z],  [x, -y, z],   [x, y, z],   [-x, y, z],  [0, 0, 1]);  // +Z (delante)
    face([x, -y, -z],  [-x, -y, -z], [-x, y, -z], [x, y, -z],  [0, 0, -1]); // -Z (atrás)
    face([x, -y, z],   [x, -y, -z],  [x, y, -z],  [x, y, z],   [1, 0, 0]);  // +X (derecha)
    face([-x, -y, -z], [-x, -y, z],  [-x, y, z],  [-x, y, -z], [-1, 0, 0]); // -X (izquierda)
    face([-x, y, z],   [x, y, z],    [x, y, -z],  [-x, y, -z], [0, 1, 0]);  // +Y (arriba)
    face([-x, -y, -z], [x, -y, -z],  [x, -y, z],  [-x, -y, z], [0, -1, 0]); // -Y (abajo)

    // Construimos la malla y la retornamos.
    box.build(gl);
    return box;
}

// OJO REVISAR
// Funcion para crear una esfera de radio , con stacks y slices, centrada en el origen. 
// stacks = paralelos de polo a polo, slices = meridianos alrededor del eje Y.
export function createSphere(gl: WebGL2RenderingContext, radius: number, stacks = 16, slices = 24): Mesh {

    const sphere = new Mesh();

    // Generaramos los vrtices

    // Recorremos la cuadricula fila por fila (paralelos) y columna por columna (meridianos).
    for (let i = 0; i <= stacks; i++) {

        // angulo vertical: 0 en el polo norte, PI en el polo sur.
        const phi = (Math.PI * i) / stacks;

        for (let j = 0; j <= slices; j++) {
        // angulo horizontal: 0 en +Z, crece hacia +X hasta dar la vuelta completa (2·PI).
        const theta = (2 * Math.PI * j) / slices;

        // Punto en una esfera de radio 1.
        // sin(phi) es el radio del paralelo: 0 en los polos, 1 en el ecuador.
        // cos(phi) es la altura: 1 arriba, 0 en el ecuador, -1 abajo.
        const nx = Math.sin(phi) * Math.sin(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.cos(theta);

        // Posicion = punto unitario × radio. Normal = el punto unitario tal cual,
        // porque en una esfera la normal apunta desde el centro hacia afuera.
        sphere.vertex(radius * nx, radius * ny, radius * nz, nx, ny, nz);
        }
    }

    // Ahora toca unir los vertices en triangulos 

    // La última columna (j = slices) repite la primera para cerrar la costura,
    // así que cada fila tiene slices + 1 vertices.
    const row = slices + 1;

    // Recorremos las casillas (no los vertices)
    for (let i = 0; i < stacks; i++) {
        for (let j = 0; j < slices; j++) {
        
        const a = i * row + j;
        const c = a + row + 1;

        // Triangulo 1: arriba-izq --> abajo-izq --> abajo-der.
        // En la ultima fila, abajo-izq y abajo-der coinciden en el polo sur: se aplasta, lo saltamos.
        if (i !== stacks - 1) sphere.triangle(a, a + row, c);

        // Triangulo 2: arriba-izq --> abajo-der --> arriba-der.
        // En la primera fila, arriba-izq y arriba-der coinciden en el polo norte: se aplasta, lo saltamos.
        if (i !== 0) sphere.triangle(a, c, a + 1);
        }
    }

    sphere.build(gl);
    return sphere;
}

// OJO REVISAR
// Cilindro a lo largo del eje Y. El lado y las tapas tienen vertices separados
export function createCylinder(gl: WebGL2RenderingContext, radius: number, height: number, segments = 24): Mesh {

    const cylinder = new Mesh();

    const h = height / 2;

    // Primero creamos los vertices del lado, luego los triangulos del lado

    const side: number[] = [];
    for (let j = 0; j <= segments; j++) {

        // angulo alrededor del eje Y: 0 en +Z, crece hacia +X.
        const theta = (2 * Math.PI * j) / segments;

        // Direccion horizontal desde el eje hacia la pared: tambien es la normal del lado.
        // No tiene componente Y porque la pared del cilindro es vertical.
        const nx = Math.sin(theta);
        const nz = Math.cos(theta);

        side.push(cylinder.vertex(radius * nx, -h, radius * nz, nx, 0, nz)); // vertice de abajo
        side.push(cylinder.vertex(radius * nx, h, radius * nz, nx, 0, nz)); // vertice de arriba
    }

    // Triangulos del lado
    
    for (let j = 0; j < segments; j++) {
        const bottom = side[2 * j];  // abajo, angulo j
        const top = side[2 * j + 1]; // arriba, angulo j
        const nextBottom = side[2 * j + 2]; // abajo, angulo j+1
        const nextTop = side[2 * j + 3];    // arriba, angulo j+1

        // Ambos en sentido antihorario vistos desde fuera.
        cylinder.triangle(bottom, nextBottom, nextTop);
        cylinder.triangle(bottom, nextTop, top);
    }

    // Las tapas 
    // sign =  1 : tapa de arriba (y = +h, normal hacia arriba).
    // sign = -1 : tapa de abajo (y = -h, normal hacia abajo).
    // Asi no repetimos el mismo código dos veces.
    for (const sign of [1, -1]) {

        // Vertice central de la tapa.
        const center = cylinder.vertex(0, sign * h, 0, 0, sign, 0);

        // Vertices del borde. Están en el mismo lugar que los del lado, pero con otra normal
        // (vertical en vez de horizontal), por eso no podemos reutilizarlos.
        const ring: number[] = [];
        for (let j = 0; j <= segments; j++) {
            const theta = (2 * Math.PI * j) / segments;
            ring.push(cylinder.vertex(radius * Math.sin(theta), sign * h, radius * Math.cos(theta), 0, sign, 0));
        }

        // Un triangulo por segmento: centro --> borde j --> borde j+1, como porciones de pizza.
        for (let j = 0; j < segments; j++) {
            if (sign > 0) {
                // Tapa de arriba
                cylinder.triangle(center, ring[j], ring[j + 1]);
            } else {
                // Tapa de abajo
                cylinder.triangle(center, ring[j + 1], ring[j]);
            }
        }
    }

    cylinder.build(gl);
    return cylinder;
}


//Plano horizontal (y = 0), de tamaño width (x) × depth (z)
export function createPlane(gl: WebGL2RenderingContext, width: number, depth: number): Mesh {

    const plane = new Mesh();

    const w = width / 2;
    const d = depth / 2;

    // Las 4 esquinas, en sentido antihorario vistas desde arriba.
    // Todas tienen la normal (0, 1, 0) porque el plano mira hacia el cielo.
    const index_v0 = plane.vertex(-w, 0, d, 0, 1, 0);    // frente-izquierda
    plane.vertex(w, 0, d, 0, 1, 0);                      // frente-derecha   
    plane.vertex(w, 0, -d, 0, 1, 0);                     // atrás-derecha    
    plane.vertex(-w, 0, -d, 0, 1, 0);                    // atrás-izquierda  

    // Dos triangulos que comparten la diagonal v0–v2, 
    plane.triangle(index_v0, index_v0 + 1, index_v0 + 2);
    plane.triangle(index_v0, index_v0 + 2, index_v0 + 3);

    plane.build(gl);
    return plane;
}

// Esta funcion es para intentar como el logo de la nacion del fuego pero hiper simplificado
// Media luna plana.
export function createCrescent(gl: WebGL2RenderingContext, radius: number, width: number, segments = 32): Mesh {
  
    const crescent = new Mesh();
    const outer: number[] = [];
    const inner: number[] = [];

    // Creamos los vertices, recorremos solo medio círculo, de t = 0 a t = PI.
    for (let i = 0; i <= segments; i++) {
        const t = (Math.PI * i) / segments;
        const c = Math.cos(t);
        const s = Math.sin(t);

        // El borde interior se acerca al exterior en las puntas (sin(t) = 0) y se aleja en el centro.
        const innerRadius = radius - width * s;

        // Todos con normal hacia arriba, porque la media luna es plana.
        outer.push(crescent.vertex(radius * c, 0, radius * s, 0, 1, 0));
        inner.push(crescent.vertex(innerRadius * c, 0, innerRadius * s, 0, 1, 0));
    }

    // Triangulos
    for (let i = 0; i < segments; i++) {
        crescent.triangle(outer[i], inner[i], outer[i + 1]);
        crescent.triangle(inner[i], inner[i + 1], outer[i + 1]);
    }

    crescent.build(gl);
    return crescent;
}