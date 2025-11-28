# Stockify API - Sistema de Gestión Integral (ERP)

Backend del sistema ERP Stockify, diseñado bajo una arquitectura monolítica modular que garantiza integridad transaccional, mantenimiento centralizado y escalabilidad. El núcleo del sistema utiliza el patrón Controller-Service para separar la lógica de negocio de la lógica de enrutamiento.

---

## 1. Descripción Técnica

### Tecnologías (PERN Stack)

* Lenguaje & Runtime: Node.js v18 (JavaScript ES6+)
* Framework Web: Express.js
* Base de Datos: PostgreSQL 14 (ACID Compliance)
* ORM/Query Builder: Driver nativo pg con consultas parametrizadas
* Autenticación: JWT con estrategia RBAC
* Seguridad: Bcrypt, Helmet, CORS
* Infraestructura: PM2, Nginx, Ubuntu 22.04

---

## 2. Arquitectura del Proyecto

El proyecto está organizado por dominios de negocio dentro de src/modules.

```
rg-plastic-api/
├── config/           # Configuración de base de datos y variables
├── middlewares/      # Autenticación, roles y validaciones
├── modules/          # Núcleo del ERP dividido por áreas
│   ├── auth/         # Login, registro, tokens
│   ├── inventory/    # Productos, movimientos, kardex
│   ├── sales/        # Clientes, pedidos, facturación
│   ├── production/   # Órdenes de producción, consumos, mermas
│   ├── finances/     # Costos, ingresos, egresos
│   ├── hhrr/         # Empleados, usuarios, asistencia
│   └── dashboard/    # KPIs y analíticas
├── utils/            # Funciones auxiliares: hash, JWT, formateadores
└── server.js         # Punto de entrada principal
```

---

## 3. Instalación y Configuración Local

### 3.1. Pre-requisitos

* Node.js v18+
* PostgreSQL 14 instalado y corriendo

### 3.2. Clonar e instalar dependencias

```
git clone <URL_DEL_REPOSITORIO>
cd rg-plastic-api
npm install
```

### 3.3. Variables de Entorno (.env)

Crear un archivo .env en la raíz del proyecto:

```
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USER=stockify_admin
DB_PASS=TU_CONTRASEÑA_SEGURA
DB_NAME=rg_plastic_db

JWT_SECRET=TU_CLAVE_SECRETA_LARGA_PARA_FIRMAR_TOKENS
NODE_ENV=development
```

---

## 4. Ejecución del Proyecto

### Modo Desarrollo

```
npm run dev
```

### Modo Producción

```
npm start
```

---

## 5. Despliegue en Producción (PM2 y Ubuntu 22.04)

```
# Instalar dependencias de producción
npm ci --production

# Iniciar proceso
pm2 start server.js --name "stockify-api"

# Guardar configuración
pm2 save

# Habilitar inicio automático
pm2 startup
```

---

## 6. Testing y QA

El proyecto utiliza Jest y Supertest para pruebas unitarias y de integración.

Cobertura actual: 85 por ciento en módulos críticos (Auth, Ventas).

Ejecutar pruebas:

```
npm test
```

---

## 7. Seguridad Implementada

### Autenticación

* Tokens JWT con expiración de 8 horas
* No se utilizan sesiones de servidor

### Autorización (RBAC)

* Middleware checkRole
* Ejemplo: Solo GERENTE accede a rutas de RRHH

### Base de Datos

* Consultas parametrizadas ($1, $2) para prevenir SQL Injection

---

## 8. Diccionario de Datos (Resumen)

| Tabla        | Descripción                                      |
| ------------ | ------------------------------------------------ |
| users        | Credenciales, roles y permisos                   |
| products     | Catálogo maestro, stock, mínimos y reorden       |
| sales_orders | Pedidos con estados: QUOTE, CONFIRMED, COMPLETED |

---

## 9. Estado del Proyecto

Backend funcional y preparado para integración con frontend web o móvil.
