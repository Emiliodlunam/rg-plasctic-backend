// src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const { comparePassword } = require('../../utils/hash');
const { generateToken } = require('../../utils/jwt');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // --- LÍNEAS DE DEPURACIÓN ---
    console.log('--- [INICIO DE LOGIN] ---');
    console.log('1. Datos recibidos del frontend:');
    console.log(`   - Username: ${username}`);
    console.log(`   - Password: ${password}`);
    // ----------------------------

    const user = await authService.findUserByUsername(username);

    // --- LÍNEAS DE DEPURACIÓN ---
    console.log('2. Usuario encontrado en la base de datos:');
    console.log(user); // Imprimimos el objeto de usuario completo
    // ----------------------------

    if (!user) {
      console.log('Resultado: Usuario no encontrado en la base de datos.');
      console.log('--- [FIN DE LOGIN] ---');
      return res.status(401).json({ success: false, message: 'Credenciales inválidas (usuario no existe).' });
    }

    // --- LÍNEAS DE DEPURACIÓN ---
    console.log('3. Comparando contraseñas...');
    console.log(`   - Contraseña del frontend: ${password}`);
    console.log(`   - Hash de la BD: ${user.password_hash}`);
    // ----------------------------

    const passwordsMatch = await comparePassword(password, user.password_hash);
    
    // --- LÍNEAS DE DEPURACIÓN ---
    console.log('4. ¿Las contraseñas coinciden?:', passwordsMatch);
    console.log('--- [FIN DE LOGIN] ---');
    // ----------------------------

    if (!passwordsMatch) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas (contraseña incorrecta).' });
    }

    // Si todo va bien, se genera el token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    const token = generateToken(tokenPayload);

    res.status(200).json({
      success: true,
      message: 'Login exitoso.',
      data: {
        token,
        user: { id: user.id, username: user.username, role: user.role },
      },
    });

  } catch (error) {
    console.error('ERROR CATASTRÓFICO EN EL LOGIN:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor.' });
  }
};

/**
 * Controlador para registrar un nuevo usuario.
 */
const register = async (req, res) => {
  try {
    const newUser = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente.',
      data: newUser,
    });
  } catch (error) {
    if (error.code === '23505') { // Error de violación de unicidad (usuario o email ya existen)
      return res.status(400).json({ success: false, message: 'El nombre de usuario o el email ya están en uso.' });
    }
    console.error('Error en el registro:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor al registrar el usuario.' });
  }
};


module.exports = {
  login,
  register,
};
