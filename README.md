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

# Crear el entorno virtual
python3 -m venv venv

# Activar el entorno virtual
source venv/bin/activate

# Instalar requerimientos
pip install -r requirements.txt

#En su defecto (si demora mucho) instalar las librerias de las siguiente forma
pip install ortools pandas numpy psycopg2-binary python-dotenv openpyxl SQLAlchemy XlsxWriter requests
```

---

### 3. Configura tu entorno

Crea un archivo `.env` en la raíz del proyecto basado en el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita ese archivo `.env` con los siguientes valores.

```bash
DATABASE_URL="postgresql://mpmuser:mpm_equipo10@localhost:5432/mpm"
JWT_SECRET="clave-secreta-jwt"
PORT=3000
```

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

### 5. Resetear la base de datos (Opcional)
⚠️ Atención: este comando eliminará toda la información que haya en la base de datos. Solo hazlo cuando quieras empezar completamente limpio o es absolutamente necesario.

```bash
# Elimina todas las tablas
npx prisma db drop --force
# Vuelca el esquema actual a la base
npx prisma db push
```

### 6. Aplica las migraciones de Prisma

En caso de no aplicar el paso anterior, realiza lo siguiente:
```bash
npx prisma generate
npx prisma db push
```

Sin importar el paso anterior, realiza lo siguiente:
```bash
npx prisma db seed
```

> Solo necesitas ejecutar esto una vez si trabajas en base local.

---

### 7. Corre el servidor


```bash
source venv/bin/activate
npm run dev
```

---

### (Opcional) Actualizar tablas


```bash
npx prisma migrate reset
npx prisma migrate dev --name nombre-migrate
```

---

## 🛠️ Stack

- Node.js
- Express
- Prisma + PostgreSQL
- JWT (Autenticación)
- dotenv, cors, morgan, bcrypt

