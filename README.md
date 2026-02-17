# Adsmurai - Conversions API (CAPI) Offline Tool

Esta herramienta ha sido diseñada para automatizar la inserción, procesamiento y envío de eventos de conversión offline desde una fuente remota (Google Drive/URL) hacia la API de Conversiones de Meta.

## 🚀 Funcionalidades Principales

* **Ingesta Dinámica:** Lectura de archivos CSV directamente desde una URL parametrizada.
* **Normalización de Datos (PII):** Limpieza estricta de emails, nombres y teléfonos según los estándares de Meta.
* **Hashing SHA-256:** Cifrado unidireccional de datos sensibles antes de la transmisión.
* **Sistema de Auditoría (Audit Log):** Generación automática de un archivo `audit_log.json` que permite la trazabilidad completa del dato: `Original -> Transformado -> Hasheado -> Petición Final`.
* **Atribución Offline:** Configuración de `action_source` como `physical_store` para optimizar la medición de impacto en puntos de venta físicos.

## 🛠️ Decisiones Técnicas y Porqué

### 1. Manejo de Identificadores Duplicados
El CSV de origen presentaba múltiples columnas de email con nombres idénticos o variaciones. Se implementó un mapeo manual mediante `headers` en `csv-parser` para garantizar que no se pierda ningún identificador, maximizando así el **Event Match Quality (EMQ)**.

### 2. Normalización antes del Hashing
Meta requiere que los datos sigan un formato específico para que el emparejamiento sea efectivo:
* **Emails:** Convertidos a minúsculas y eliminando espacios en blanco.
* **Teléfonos:** Eliminación de símbolos, guiones y espacios, dejando solo caracteres numéricos.
* **Nombres:** Extracción del nombre de pila y normalización a minúsculas.

### 3. Timestamp Unix
La API de Meta requiere el `event_time` en segundos (Unix timestamp). El script realiza la conversión automática de las fechas ISO/Checkout del CSV para asegurar que los eventos se registren en el momento real de la transacción.

---

## ⚙️ Configuración y Montaje

Sigue estos pasos para poner en marcha la herramienta:

### 1. Requisitos Previos
* **Node.js** (v14 o superior recomendado).
* Un **Pixel de Meta** con acceso a la API de Conversiones.
* Un **Token de Acceso** generado desde el Business Manager de Meta.

### 2. Instalación
Clona el repositorio o descarga los archivos y ejecuta:
```bash
npm install