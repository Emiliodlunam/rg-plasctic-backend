const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    // --- LÍNEA DE DEPURACIÓN ---
    console.log(`[Auth Check] Rol del usuario: '${userRole}'. Roles permitidos: [${allowedRoles.join(', ')}]`);
    const upperAllowedRoles = allowedRoles.map(role => role.toUpperCase());
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. No tienes los permisos necesarios para esta acción.',
      });
    }
    next();
  };
};

module.exports = {
  checkRole,
};