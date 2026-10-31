import { DIAS_SEMANA, Horario, type IHorario } from "../models/Horario";

/** Siempre devuelve los 7 dias en orden; los que no se han configurado figuran sin atencion. */
export async function obtenerSemana() {
  const docs = await Horario.find();
  const dias = DIAS_SEMANA.map((dia) => {
    const d = docs.find((x) => x.dia === dia);
    return {
      dia,
      atiende: d?.atiende ?? false,
      franjas: (d?.franjas ?? []).map((f) => ({ inicio: f.inicio, fin: f.fin })),
    };
  });
  return { dias };
}

export async function guardarSemana(dias: Pick<IHorario, "dia" | "atiende" | "franjas">[]) {
  await Horario.bulkWrite(
    dias.map((d) => ({
      updateOne: {
        filter: { dia: d.dia },
        update: { $set: { atiende: d.atiende, franjas: d.franjas } },
        upsert: true,
      },
    })),
  );
  return obtenerSemana();
}
