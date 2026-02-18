# Adsmurai - Conversions API (CAPI) Offline Tool

Esta herramienta la he diseñado para automatizar la inserción, normalización y envío de eventos de conversión offline. Su función principal es conectar fuentes de datos estáticas (en este caso CSV Vía Google Drive) con la **API de Conversiones de Meta**, asegurando que cada venta física se atribuya correctamente a las campañas digitales.

## 🚀 Funcionalidades Principales

* **Inserción Dinámica:** Lectura de archivos CSV directamente desde una URL remota (Google Drive), procesando los datos en *stream* para optimizar memoria.
* **Normalización de Datos:** Limpieza estricta de emails, nombres y teléfonos siguiendo los estándares de calidad de Meta (EMQ).
* **Hashing SHA-256:** Cifrado unidireccional de todos los datos sensibles antes de salir del entorno local ("Privacy by Design") hacia plataforma.
* **Sistema de Auditoría (Audit Log):** Generación automática del archivo `audit_log.json` que ofrece la visualización de la trazabilidad total: 
`Dato Original -> Transformado -> Payload Final (datos hasheados)`.
* **Atribución Offline:** Configuración estratégica del parámetro `action_source` como `physical_store` para optimizar la medición en puntos de venta físicos.

---

## 🛠️ Decisiones Técnicas y Justificación

### 1. Estrategia Multi-Key Matching (Maximización del EMQ)
El archivo de origen contiene múltiples columnas de correo electrónico (`email`) dispersas. En lugar de seleccionar arbitrariamente una sola, el algoritmo captura y procesa todas las variantes disponibles para un mismo usuario.
> **¿Por qué?** La API de Conversiones de Meta acepta arrays de identificadores. Al enviar múltiples hashes de email para un solo evento (ej: personal, trabajo, antiguo), se aumenta la posibilidad de match, disparando la puntuación de **Event Match Quality (EMQ)**.

### 2. Normalización antes del Hashing
Meta es muy estricto con el formato de los datos antes de recibir el hash. El script aplica las siguientes reglas de negocio:
* **Emails:** Conversión a minúsculas y *trim* de espacios.
* **Teléfonos:** Eliminación de cualquier símbolo no numérico (guiones, paréntesis, espacios).
* **Nombres:** Extracción del primer nombre (nombre de pila) y normalización a minúsculas.

### 3. Timestamp Unix
La API requiere el tiempo en segundos (Unix Timestamp), no en milisegundos ni formato ISO.
> **Solución:** He implementado una conversión automática de la fecha facilitada en el CSV para asegurar que el evento se registre en el momento exacto de la transacción y no en el momento de la ejecución del script.

### 4. Audit Log para Debugging
Dado que las integraciones "Server-to-Server" no dan mucha visualización y no tengo acceso al panel de Meta, he añadido la generación del archivo `audit_log.json`. 
Me permite verificar los datos enviados a Meta sin mirar peticiones y asi poder detectar errores en los datos.

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
