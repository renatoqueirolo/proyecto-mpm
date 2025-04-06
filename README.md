# 🚀 Optimización del Sistema de Transporte para MPM

Este proyecto tiene como objetivo desarrollar una solución digital integrada (aplicación móvil y plataforma web) para mejorar la programación de transporte de trabajadores en faena de la empresa MPM, reduciendo los costos operativos y mejorando la calidad de vida de los empleados.

---

## 🧩 Contexto

MPM es una empresa contratista de servicios para la minería, con más de 1.400 trabajadores, que cada 14 días traslada a 600 personas desde distintas ciudades del país hacia las faenas de Escondida, Spence y Centinela. Actualmente, el proceso logístico se gestiona de forma manual usando Excel, lo cual genera altos costos y baja eficiencia.

---

## 🎯 Objetivos del Proyecto

- Minimizar los tiempos de viaje y espera de los trabajadores.
- Reducir los costos logísticos asociados al transporte.
- Digitalizar el proceso de solicitud, programación y seguimiento de viajes.
- Facilitar la participación de los trabajadores mediante una aplicación intuitiva.
- Generar análisis y reportes para la toma de decisiones.


# MPM Backend – Setup Instrucciones

Este proyecto es el backend del sistema de planificación de itinerarios para MPM. Está construido en **Node.js + Express**, usa **PostgreSQL** como base de datos, y **Prisma** como ORM.

---

## 🚀 Pasos para correr la aplicación

### 1. Clona el repositorio

```bash
git clone https://github.com/renatoqueirolo/proyecto-mpm.git
cd proyecto-mpm
```

---

### 2. Instala las dependencias

```bash
npm install
```

---

### 3. Configura tu entorno

Crea un archivo `.env` en la raíz del proyecto basado en el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita ese archivo `.env` con tus valores reales.

---

### 4. Configura PostgreSQL localmente

Asegúrate de tener PostgreSQL corriendo en tu entorno local. Luego, crea un usuario y una base de datos:

```bash
sudo -u postgres psql
```

Dentro de psql:

```sql
CREATE USER mpmuser WITH PASSWORD 'mpm_equipo10';
CREATE DATABASE mpm;
GRANT ALL PRIVILEGES ON DATABASE mpm TO mpmuser;
ALTER USER mpmuser CREATEDB;
\q
```

---

### 5. Aplica las migraciones de Prisma

```bash
npx prisma generate
npx prisma db push
```

> Solo necesitas ejecutar esto una vez si trabajas en base local.

---

### 6. Corre el servidor

```bash
npm run dev
```

---

## 🛠️ Stack

- Node.js
- Express
- Prisma + PostgreSQL
- JWT (Autenticación)
- dotenv, cors, morgan, bcrypt

