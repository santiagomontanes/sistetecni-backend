module.exports = (req, res) => {
  if (req.method === 'POST') {
    res.status(200).json({ message: 'Archivo subido correctamente' });
  } else {
    res.status(405).json({ error: 'Método no permitido' });
  }
};
