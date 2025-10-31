import multiparty from "multiparty";
import fs from "fs";
import sharp from "sharp";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const form = new multiparty.Form();

    form.parse(req, async (err, fields, files) => {
      if (err) return res.status(500).json({ error: "Error al procesar el archivo" });

      const file = files.file[0];
      const buffer = fs.readFileSync(file.path);

      const outputPath = path.join("/tmp", `compressed-${file.originalFilename}`);

      await sharp(buffer)
        .jpeg({ quality: 70 }) // Ajusta la compresión (70 = buena calidad, tamaño menor)
        .toFile(outputPath);

      return res.status(200).json({
        message: "Imagen comprimida correctamente",
        file: `compressed-${file.originalFilename}`,
      });
    });
  } else {
    return res.status(405).json({ error: "Método no permitido" });
  }
}
