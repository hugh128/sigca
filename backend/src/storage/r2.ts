import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Almacenamiento, ArchivoGuardado } from "./tipos";

export interface ConfigR2 {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** URL publica del bucket, p. ej. https://pub-xxxx.r2.dev o https://imagenes.midominio.com */
  urlPublica: string;
  /** Solo pruebas. Por defecto https://<accountId>.r2.cloudflarestorage.com */
  endpoint?: string;
}

/** Cloudflare R2 (compatible con la API de S3). La base de datos solo guarda la URL y la llave. */
export class AlmacenamientoR2 implements Almacenamiento {
  readonly nombre: string;
  private readonly s3: S3Client;
  private readonly urlPublica: string;

  constructor(private readonly cfg: ConfigR2) {
    this.nombre = `Cloudflare R2 (bucket "${cfg.bucket}")`;
    this.urlPublica = cfg.urlPublica.replace(/\/+$/, "");
    this.s3 = new S3Client({
      region: "auto",
      endpoint: cfg.endpoint ?? `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      // Recomendado por Cloudflare para el SDK de AWS v3: solo calcular checksums cuando son obligatorios.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }

  async guardar(key: string, contenido: Buffer, contentType: string): Promise<ArchivoGuardado> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: contenido,
        ContentType: contentType,
        // Los nombres llevan un UUID: un archivo nunca cambia, asi que puede cachearse un anio.
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: `${this.urlPublica}/${key}` };
  }

  async eliminar(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }
}
