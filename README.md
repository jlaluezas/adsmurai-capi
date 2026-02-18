# Adsmurai - Conversions API (CAPI) Offline Tool

Esta herramienta ha sido diseñada para automatizar la ingesta, normalización y envío de eventos de conversión offline. Su función principal es conectar fuentes de datos estáticas (como exportaciones CSV en Google Drive) con la **API de Conversiones de Meta**, asegurando que cada venta física se atribuya correctamente a las campañas digitales.

## 🚀 Funcionalidades Principales

* **Ingesta Dinámica:** Lectura de archivos CSV directamente desde una URL remota, procesando los datos en *stream* para optimizar memoria.
* **Normalización de Datos (PII):** Limpieza estricta de emails, nombres y teléfonos siguiendo los estándares de calidad de Meta (EMQ).
* **Hashing SHA-256:** Cifrado unidireccional de todos los datos sensibles antes de salir del entorno local ("Privacy by Design").
* **Sistema de Auditoría (Audit Log):** Generación automática de un archivo `audit_log.json` que ofrece trazabilidad total: `Dato Original -> Transformado -> Hasheado -> Payload Final`.
* **Atribución Offline:** Configuración estratégica del parámetro `action_source` como `physical_store` para optimizar la medición en puntos de venta físicos.

---

## 🛠️ Decisiones Técnicas y Justificación

### 1. Manejo de Identificadores Duplicados
Al analizar el CSV de origen, detecté múltiples columnas con variaciones de email. Para no perder datos, implementé un mapeo manual de `headers` en la lectura del CSV.
> **¿Por qué?** Esto maximiza el **Event Match Quality (EMQ)** al asegurar que procesamos la columna correcta sin importar el nombre que tenga en el archivo crudo.

### 2. Normalización antes del Hashing
Meta es muy estricto con el formato de los datos antes de recibir el hash. El script aplica las siguientes reglas de negocio:
* **Emails:** Conversión a minúsculas y *trim* de espacios.
* **Teléfonos:** Eliminación de cualquier símbolo no numérico (guiones, paréntesis, espacios).
* **Nombres:** Extracción del primer nombre (nombre de pila) y normalización a minúsculas.

### 3. Timestamp Unix
La API requiere el tiempo en segundos (Unix Timestamp), no en milisegundos ni formato ISO.
> **Solución:** He implementado una conversión automática de la fecha para asegurar que el evento se registre en el momento exacto de la transacción y no en el momento de la ejecución del script.

### 4. Audit Log para Debugging
Dado que las integraciones "Server-to-Server" no dan mucha visualización y no tengo acceso al panel de Meta, he añadido la generación del archivo `audit_log.json`.
> **Valor añadido:** Me permite verificar los datos enviados a Meta sin mirar peticiones y asi poder detectar errores en los datos.

---

## ⚙️ Configuración y Montaje

Sigue estos pasos para poner en marcha la herramienta en local:

### 1. Requisitos Previos
Necesitarás tener instalado **Node.js** (versión 14 o superior).

### 2. Instalación de Dependencias
Clona este repositorio (o descarga los archivos) y ejecuta el siguiente comando en la terminal para instalar las librerías necesarias (`axios`, `csv-parser`, etc.):
Estas librerias están especificadas en el archivo `package.json`

npm install

### 3. Ejecución Asmurai-CAPI

node index.js
