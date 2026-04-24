export type Emitter =
    | { type: 'point';  x: number; y: number }
    | { type: 'circle'; x: number; y: number; radius: number }
    | { type: 'rect';   x: number; y: number; width: number; height: number }