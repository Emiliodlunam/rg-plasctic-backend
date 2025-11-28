// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// --- Importar Rutas de Módulos ---
const inventoryRoutes = require('./src/modules/inventory/inventory.routes');
const authRoutes = require('./src/modules/auth/auth.routes');
const supplierRoutes = require('./src/modules/suppliers/suppliers.routes');
const salesRoutes = require('./src/modules/sales/sales.routes');
const productionRoutes = require('./src/modules/production/production.routes');
const financesRoutes = require('./src/modules/finances/finances.routes');
const hhrrRoutes = require('./src/modules/hhrr/hhrr.routes');
const dashboardRoutes = require('./src/modules/dashboard/dashboard.routes');
const auditRoutes = require('./src/modules/audit/audit.routes');
const notificationRoutes = require('./src/modules/notifications/notifications.routes');

// ... aquí importaremos las otras rutas a medida que las creemos

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Globales ---
app.use(cors());       // Permite peticiones de otros dominios
app.use(helmet());     // Añade cabeceras de seguridad
app.use(express.json()); // Permite al servidor entender JSON

// --- Rutas Principales de la API ---
app.get('/', (req, res) => {
    res.send('API de Stockify funcionando correctamente!');
});

// --- Enrutadores de Módulos ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/suppliers', supplierRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/finances', financesRoutes);
app.use('/api/v1/hhrr', hhrrRoutes);
app.use('/api/v1/dashboard', dashboardRoutes); 
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
// ... aquí usaremos las otras rutas

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});