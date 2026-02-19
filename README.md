# Adsmurai - Conversions API (CAPI) Offline Tool

Esta herramienta la he diseñado para automatizar la inserción, normalización y envío de eventos de conversión offline. Su función principal es conectar fuentes de datos estáticas (en este caso CSV Vía Google Drive) con la **API de Conversiones de Meta**, asegurando que cada venta física se atribuya correctamente a las campañas digitales.
En este caso únicamente esta centrado para procesar el csv facilitado.

## Funcionalidades Principales

* **Inserción Dinámica:** Lectura de archivos CSV directamente desde una URL remota (Google Drive), procesando los datos en *stream* para optimizar memoria.
* **Normalización de Datos:** Limpieza estricta de emails, nombres y teléfonos siguiendo los estándares de calidad de Meta (EMQ).
* **Hashing SHA-256:** Cifrado unidireccional de todos los datos sensibles antes de salir del entorno local hacia plataforma.
* **Sistema de Auditoría (Audit Log):** Generación automática del archivo `audit_log.json` que ofrece la visualización de la trazabilidad total: 
`Dato Original -> Transformado -> Payload Final (datos hasheados)`.
* **Atribución Offline:** Configuración estratégica del parámetro `action_source` como `physical_store` para optimizar la medición en puntos de venta físicos.

---

## Decisiones y Justificación

### 1. Estrategia Multi-Key Matching (Maximización del EMQ)
El archivo de origen contiene múltiples columnas de correo electrónico (`email`) dispersas. En lugar de seleccionar arbitrariamente una sola, el algoritmo captura y procesa todas las variantes disponibles para un mismo usuario.
La API de Conversiones de Meta acepta arrays de identificadores. Al enviar múltiples hashes de email para un solo evento (ej: personal, trabajo, antiguo), se aumenta la posibilidad de match, disparando la puntuación de **Event Match Quality (EMQ)**.

### 2. Normalización antes del Hashing
Meta es muy estricto con el formato de los datos antes de recibir el hash. El script aplica las siguientes reglas de negocio:
* **Emails:** Conversión a minúsculas y *trim* de espacios.
* **Teléfonos:** Eliminación de cualquier símbolo no numérico (guiones, paréntesis, espacios).
* **Nombres:** Extracción del primer nombre (nombre de pila) y normalización a minúsculas.
He seguido las reglas de normalización/hashing de la documentación.

### 3. Timestamp Unix
La API requiere el tiempo en segundos (Unix Timestamp)
He implementado una conversión automática de la fecha facilitada en el CSV para asegurar que el evento se registre en el momento exacto de la transacción y no en el momento de la ejecución del script.

### 4. Audit Log para Debugging
Dado que las integraciones "Server-to-Server" no dan mucha visualización y no tengo acceso al panel de Meta, he añadido la generación del archivo `audit_log.json`. 
Me permite verificar los datos enviados a Meta sin mirar peticiones y asi poder detectar errores en los datos.

### 5. Normalización de Eventos (Event Mapping)
El archivo de origen utiliza terminología interna (`Checkout`) que no corresponde con los Eventos Estándar de Meta.
Si enviamos "Checkout" tal cual, Meta lo interpreta como un "Custom Event", perdiendo la capacidad de optimizar campañas a ROAS (Retorno de Inversión). Al forzar `Purchase`, garantizamos que el algoritmo reconozca la venta correctamente.

** Decisión tomada, es totalmente reversible. Únicamente he pensado que sería mejor. **

### 6. Estrategia de Deduplicación (Event ID Determinista)
Ante la ausencia de un `Transaction ID`  en el CSV, el programa genera un `event_id` determinista basado en la concatenación de variables clave (Email Principal + Timestamp + Valor) y lo procesa mediante SHA-256.
Si el mismo archivo se envia dos veces, el script generará idénticos `event_id`. La API de Meta reconocerá esta clave idéntica y descartará los eventos duplicados garantizando datos reales.

--------

### Comentarios / Conclusiones ###
- El evento indicado en Google Drive era Checkout, pero al ser conversiones offline de una tienda he decidido enviarlo como Purchase (evento standard de Meta).
- Todos los valores del evento relacionado con el usuarios son hasheados menos el `madid` como indica la documentación.
- Para verificar al 100% la integración de los eventos en plataforma debiera poder ver el panel de Meta, por mi lado he hecho esta parte de `audit_log.json` para asegurarme.
- El hasheado de los datos se procesa en `hashing.js`, este pone los valores en minúsuculas como indica la documentación. Se le pasa el cifrado `SHA-256` y después lo convertimos en una cadena de texto hexadecimal `hex`.
- En el gitignore, únicamente tengo `audit_log.json`, archivo generado tras la ejecución. `node_modules` carpeta generada tras la instalación del proyecto con npm install.
Normalmente también incluíria el `.env` ya que las credenciales no debieran subirse, pero al tratarse de una prueba asi no tenéis que generarlo.


## Configuración y Montaje

Pasos necesarios en local:

### 1. Requisitos Previos
Necesitarás tener instalado **Node.js** (versión 14 o superior).

### 2. Instalación de Dependencias
Clona este repositorio (o descarga los archivos) y ejecuta el siguiente comando en la terminal para instalar las librerías necesarias (`axios`, `csv-parser`, etc.):
Estas librerias están especificadas en el archivo `package.json`.

- npm install

### 3. Ejecución Adsmurai-CAPI

- node index.js
