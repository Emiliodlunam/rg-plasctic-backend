Stockify API - Sistema de Gestión Integral (ERP)📋 Descripción TécnicaBackend del sistema ERP "Stockify", diseñado bajo una arquitectura monolítica modular para garantizar la integridad transaccional y facilitar el mantenimiento centralizado. Este sistema gestiona procesos críticos de Inventario, Ventas, Producción, Finanzas y Recursos Humanos, operando en un entorno seguro y escalable.El núcleo se basa en el patrón Controller-Service para desacoplar la lógica de negocio de la lógica de enrutamiento.🛠️ Stack Tecnológico (PERN)Lenguaje & Runtime: Node.js v18 (JavaScript ES6+)Framework Web: Express.jsBase de Datos: PostgreSQL 14 (ACID Compliance)ORM/Query Builder: Driver nativo pg con consultas parametrizadas.Autenticación: JWT (JSON Web Tokens) con estrategia RBAC.Seguridad: Bcrypt (Hashing), Helmet, CORS.Infraestructura: PM2 (Process Manager), Nginx (Reverse Proxy), Ubuntu 22.04.📂 Arquitectura del ProyectoLa estructura sigue una separación por dominios de negocio, tal como se visualiza en src/modules:rg-plastic-api/
├── config/           # Configuración de DB (postgres.js) y variables
├── middlewares/      # Lógica intermedia (auth.middleware.js, role.middleware.js)
├── modules/          # Núcleo del sistema (Módulos)
│   ├── auth/         # Login y Registro
│   ├── inventory/    # Productos y Movimientos
│   ├── sales/        # Clientes y Pedidos (Transaccional)
│   ├── production/   # Órdenes de Producción, Consumos y Mermas
│   ├── finances/     # Costos, Ingresos y Egresos
│   ├── hhrr/         # Empleados, Usuarios y Asistencia
│   └── dashboard/    # KPIs y agregación de datos
├── utils/            # Helpers (hash.js, jwt.js)
└── server.js         # Punto de entrada
🚀 Instalación y Configuración Local1. Pre-requisitosNode.js v18+PostgreSQL 14 instalado y corriendo.2. Clonar e Instalargit clone <URL_DEL_REPO>
cd rg-plastic-api
npm install
3. Variables de Entorno (.env)Crea un archivo .env en la raíz del proyecto (basado en el manual técnico):PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_USER=stockify_admin
DB_PASS=TU_CONTRASEÑA_SEGURA
DB_NAME=rg_plastic_db
JWT_SECRET=TU_CLAVE_SECRETA_LARGA_PARA_FIRMAR_TOKENS
NODE_ENV=development
4. Ejecución# Modo Desarrollo (con nodemon si está instalado o node directo)
npm run dev

# Modo Producción (usando node directo)
npm start
⚙️ Scripts de Despliegue (Producción)Para el despliegue en servidor Ubuntu 22.04, se utiliza PM2 para la gestión de procesos:# Instalar dependencias de producción
npm ci --production

# Iniciar con PM2
pm2 start server.js --name "stockify-api"

# Asegurar reinicio en caso de reboot del servidor
pm2 save
pm2 startup
🧪 Testing y QAEl proyecto cuenta con una batería de pruebas (Unitarias e Integración) utilizando Jest y Supertest.Cobertura: 85% en módulos críticos (Auth, Ventas).Ejecutar tests:npm test
🔒 Seguridad ImplementadaAutenticación: Tokens JWT con expiración de 8 horas. No se usan sesiones de servidor.Autorización (RBAC): Middleware checkRole intercepta peticiones. Ejemplo: Solo GERENTE puede acceder a rutas de RRHH.Base de Datos: Uso estricto de consultas parametrizadas ($1, $2) para prevenir SQL Injection.📖 Diccionario de Datos Resumidousers: Credenciales y roles.products: Catálogo maestro, stock actual, puntos de reorden.sales_orders: Cabeceras de pedidos (Estados: QUOTE, CONFIRMED, COMPLETED).