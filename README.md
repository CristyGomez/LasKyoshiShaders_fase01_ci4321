# Fase 1: Apuntar al objetivo (CI4321)

**Equipo:** Las Kyoshi Shaders

**Integrantes:**

- Cristina Gómez
- Sandibel Soares

Juego de práctica de tiro en 3D hecho con WebGL2, TypeScript y FixedFunction. Un tanque (inspirado en la Nación del Fuego) se mueve de lado a lado sobre un campo de tierra y dispara una bala negra con trayectoria parabólica contra tres objetivos flotantes. Todas las figuras (caja, esfera, cilindro, plano y media luna) se generan en código.

## Requisitos

- Node.js 18 o superior
- npm
- Un navegador con soporte para WebGL2 (Chrome, Edge o Firefox)

## Cómo correrlo

1. Instalar las dependencias (solo la primera vez):

   ```
   npm install
   ```

2. Iniciar el servidor de desarrollo:

   ```
   npm run dev
   ```

3. Abrir `http://localhost:5173` en el navegador.

## Controles

| Tecla                 | Acción                                                      |
| --------------------- | ----------------------------------------------------------- |
| `←` `→`               | Mover el tanque a la izquierda o a la derecha               |
| `↑` `↓`               | Subir o bajar el cañón (entre 5° y 90°)                     |
| `1` `2` `3`           | Elegir el nivel de fuerza                                   |
| `F`                   | Cambiar al siguiente nivel de fuerza (1 > 2 > 3 > 1)        |
| `Espacio`             | Disparar (solo si la bala está en la punta del cañón)       |
| `R`                   | Reiniciar: reaparecen los objetivos y la bala vuelve al cañón |

Al mantener presionada una flecha, el movimiento empieza lento y acelera. Un toque corto sirve para afinar la puntería.

## Otros comandos

| Comando           | Acción                                              |
| ----------------- | --------------------------------------------------- |
| `npm run build`   | Revisa los tipos con `tsc` y genera `dist/`         |
| `npm run preview` | Sirve localmente la carpeta `dist/` ya construida   |

## Estructura del proyecto

```
index.html            estructura de la página y texto de controles
src/main.ts           escena, cámara, entrada por teclado y game loop
src/constants.ts      colores del cielo y el suelo, cámara y tamaño del canvas
src/mesh.ts           clase Mesh (VAO y buffers) y drawPart
src/primitives.ts     generadores de caja, esfera, cilindro, plano y media luna
src/tank.ts           medidas, colores y jerarquía de matrices del tanque
src/targets.ts        posición y estado de los objetivos
src/projectile.ts     física de la bala, colisiones y cálculo de la trayectoria
src/trajectory.ts     línea de vista previa de la trayectoria
src/vendor/ff/        FixedFunction v1.0 del curso (no se modificó)
```