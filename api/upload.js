export default function handler(req, res) {
  if (req.method === 'POST') {
    return res.status(200).json({ message: 'Archivo subido correctamente' });
  }
  res.status(405).json({ error: 'Método no permitido' });
}
