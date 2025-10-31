import fs from "fs";
import sharp from "sharp";
import multiparty from "multiparty";
import fetch from "node-fetch";

export const config = { api: { bodyParser: false } };

const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // se configura en Vercel
const REPO_OWNER = "santiagomontanes";
const REPO_NAME = "sistetecni-web";
const BRANCH = "main"; // o "master" si tu repo lo usa

async function getFileSha(path) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`,
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    }
  );
  if (res.status === 200) {
    const json = await res.json();
    return json.sha;
  }
  return null;
}

async function putFile(path, contentBase64, message) {
  const sha = await getFileSha(path);
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message,
        content: contentBase64,
        branch: BRANCH,
        ...(sha ? { sha } : {})
      })
    }
  );
  return res.json();
}

async function getCatalog() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/catalog.json?ref=${BRANCH}`,
    {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    }
  );
  const json = await res.json();
  const decoded = Buffer.from(json.content, "base64").toString("utf-8");
  return { data: JSON.parse(decoded), sha: json.sha };
}

async function saveCatalog(newCatalog, sha) {
  const contentBase64 = Buffer.from(
    JSON.stringify(newCatalog, null, 2),
    "utf-8"
  ).toString("base64");
  const res = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/data/catalog.json`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: "Actualización automática del catálogo",
        content: contentBase64,
        branch: BRANCH,
        sha
      })
    }
  );
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const name = fields.nombre?.[0] || "Producto sin nombre";
    const price = fields.precio?.[0] || "A convenir";
    const cat = fields.categoria?.[0] || "General";
    const file = files.image?.[0];
    if (!file) return res.status(400).json({ error: "No se subió ningún archivo" });

    const origBuffer = await fs.promises.readFile(file.path);

    // 🔧 Compresión hasta 0.5 MB
    let quality = 80;
    let outBuffer = await sharp(origBuffer).jpeg({ quality }).toBuffer();
    while (outBuffer.length > 500 * 1024 && quality > 30) {
      quality -= 5;
      outBuffer = await sharp(origBuffer).jpeg({ quality }).toBuffer();
    }

    const filename = `prod-${Date.now()}.jpg`;
    const imgPath = `assets/img/${filename}`;
    const imgB64 = outBuffer.toString("base64");
    await putFile(imgPath, imgB64, `Nueva imagen: ${filename}`);

    const { data: catalog, sha } = await getCatalog();
    const newItem = {
      id: `prd-${Date.now()}`,
      nombre: name,
      categoria: cat,
      precio: price,
      descripcion: fields.descripcion?.[0] || "",
      img: `assets/img/${filename}`,
      imgs: [`assets/img/${filename}`],
      estado: "disponible"
    };
    catalog.push(newItem);
    await saveCatalog(catalog, sha);

    res.json({ ok: true, item: newItem });
  });
}
