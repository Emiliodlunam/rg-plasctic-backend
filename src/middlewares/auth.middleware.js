// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const authService = require('../modules/auth/auth.service');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Acceso denegado. Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificamos que el usuario del token todavía exista en la BD
    const user = await authService.findUserByUsername(decoded.username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado.' });
    }

    req.user = user; // Añadimos el usuario a la petición para usarlo en otros controladores
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido.' });
  }
};

module.exports = {
  verifyToken,
};