require('dotenv').config();
const axios = require('axios');
const csv = require('csv-parser');
const stream = require('stream');
const fs = require('fs');
const { hashData } = require('./tools/hashing');

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const CSV_URL = process.env.CSV_URL;

async function run() {
    console.log('--- Iniciando Proceso CAPI: Multi-Email Matching ---');
    
    const headers = ['em0', 'em1', 'em2', 'phone', 'madid', 'name', 'zip', 'country', 'gender', 'action', 'time', 'price'];

    try {
        console.log('1. Descargando CSV...');
        const response = await axios.get(CSV_URL);
        const csvContent = response.data;

        if (csvContent.includes('<html')) throw new Error('URL inválida');

        console.log('2. Procesando con estrategia Multi-Key...');
        const { eventsToSend, auditTrail } = await processData(csvContent, headers);

        fs.writeFileSync('audit_log.json', JSON.stringify(auditTrail, null, 2));
        console.log(`Audit Log generado (${auditTrail.length} eventos).`);

        if (eventsToSend.length > 0) {
            console.log(`3. Enviando ${eventsToSend.length} eventos a Meta...`);
            await uploadToMeta(eventsToSend);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

function processData(content, headers) {
    return new Promise((resolve) => {
        const eventsToSend = [];
        const auditTrail = [];
        let counter = 1;
        
        const bufferStream = new stream.PassThrough();
        bufferStream.end(content);

        bufferStream
            .pipe(csv({ headers, skipLines: 1 }))
            .on('data', (row) => {
                if ((row.em0 && row.em0.includes('@')) || (row.em1 && row.em1.includes('@')) || (row.em2 && row.em2.includes('@'))) {
                    const result = formatAndAudit(row, counter);
                    if (result) {
                        eventsToSend.push(result.event);
                        auditTrail.push(result.audit);
                        counter++;
                    }
                }
            })
            .on('end', () => resolve({ eventsToSend, auditTrail }));
    });
}

function formatAndAudit(row, index) {
    try {
        // --- 1. EXTRACCIÓN Y LIMPIEZA DE EMAILS (Multi-Key) ---
        const rawEmails = [row.em0, row.em1, row.em2].filter(e => e && e.includes('@'));
        
        const processedEmails = rawEmails.map(email => {
            const clean = email.trim().toLowerCase();
            return { clean: clean, hash: hashData(clean, 'em') };
        });

        // --- 2. TRANSFORMACIÓN DEL RESTO DE DATOS ---

        // Teléfono
        const cleanPhone = (row.phone || '').replace(/\D/g, '');
        
        // Nombre y Apellidos
        const nameParts = (row.name || '').trim().split(' ');
        const firstName = nameParts[0]?.toLowerCase() || '';
        const lastName = nameParts.slice(1).join(' ')?.toLowerCase() || '';

        // Ubicación y Demografía
        const cleanZip = (row.zip || '').trim().toLowerCase(); 
        const cleanCountry = (row.country || '').trim().toLowerCase(); 
        const cleanGender = (row.gender || '').toLowerCase().startsWith('f') ? 'f' : 'm';

        //Identificador anunciantes
        const rawMadid = (row.madid || '').trim();

        // Datos Económicos
        const cleanValue = parseFloat(row.price?.replace(/[^\d,.]/g, '').replace(',', '.') || 0);
        const cleanCurrency = row.price?.includes('€') ? 'EUR' : 'USD';

        // Fecha 
        let parsedDate = new Date((row.time || '').trim().replace(/['"]/g, ''));
        if (isNaN(parsedDate.getTime())) parsedDate = new Date(); 
        const eventTime = Math.floor(parsedDate.getTime() / 1000);

        // --- 3. HASHING ---
        const hashedEmailArray = processedEmails.map(item => item.hash);
        const hashedPhone = hashData(cleanPhone, 'ph');
        const hashedFirstName = hashData(firstName);
        const hashedLastName = hashData(lastName);
        const hashedZip = hashData(cleanZip);
        const hashedCountry = hashData(cleanCountry);
        const hashedGender = hashData(cleanGender);

        // --- 4. CONSTRUCCIÓN DEL EVENTO ---
        const event = {
            event_name: 'Purchase',
            event_time: eventTime,
            action_source: 'physical_store',
            user_data: {
                em: hashedEmailArray,
                ph: [hashedPhone],
                fn: [hashedFirstName],
                ln: [hashedLastName],
                ge: [hashedGender],
                zp: [hashedZip],
                country: [hashedCountry],
                madid: rawMadid
            },
            custom_data: {
                value: cleanValue,
                currency: cleanCurrency
            }
        };

        // --- 5. AUDITORÍA COMPLETA (TODOS LOS CAMPOS) ---
        const audit = {
            evento_nro: index,
            datos_recibidos: { 
                emails_raw: rawEmails,
                nombre_completo: row.name,
                telefono: row.phone,
                madid: row.madid,
                zip: row.zip,
                pais: row.country,
                genero: row.gender,
                precio_raw: row.price,
                fecha_raw: row.time
            },
            datos_transformados: {
                emails_limpios: processedEmails.map(p => p.clean),
                nombre: firstName,
                apellido: lastName,
                telefono: cleanPhone,
                madid: rawMadid,
                zip: cleanZip,
                pais: cleanCountry,
                genero: cleanGender,
                valor: cleanValue,
                moneda: cleanCurrency,
                timestamp: eventTime
            },
            peticion_meta: event
        };
        return { audit, event };

  } catch (e) {
        console.error('ERROR DETECTADO:', e.message);
        return null;
    }
}


async function uploadToMeta(events) {
    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;
    try {
        const res = await axios.post(url, { data: events }, {
            params: { access_token: ACCESS_TOKEN }
        });
        console.log('ÉXITO: Status', res.status);
        console.log('Eventos aceptados por Meta:', res.data.events_received);
        console.log('FB Trace ID:', res.data.fbtrace_id);
    } catch (error) {
        console.error('Error API Meta:', error.response?.data?.error?.message || error.message);
    }
}

run();