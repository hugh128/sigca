export interface ArchivoGuardado {
  /** Llave del objeto dentro del almacenamiento (p. ej. "carrusel/2026/uuid.webp"). Se guarda junto a la URL. */
  key: string;
  /** URL publica para mostrar la imagen. */
  url: string;
}

/** Contrato comun de los almacenamientos: el resto del sistema no sabe si usa R2 o disco. */
export interface Almacenamiento {
  readonly nombre: string;
  guardar(key: string, contenido: Buffer, contentType: string): Promise<ArchivoGuardado>;
  eliminar(key: string): Promise<void>;
}
