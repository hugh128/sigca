/**
 * Transformacion comun de toJSON para los modelos:
 *  - expone `id` en lugar de `_id`
 *  - elimina `__v` y los campos privados indicados (p. ej. passwordHash)
 */
export function jsonTransform(camposOcultos: string[] = []) {
  return (_doc: unknown, ret: Record<string, unknown>) => {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    for (const campo of camposOcultos) delete ret[campo];
    return ret;
  };
}
