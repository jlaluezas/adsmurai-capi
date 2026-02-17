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
    console.log('--- Iniciando Proceso de Conversiones Offline con Trazabilidad Completa ---');
    
    const headers = ['em0', 'em1', 'em2', 'phone', 'madid', 'name', 'zip', 'country', 'gender', 'action', 'time', 'price'];

    try {
        console.log('1. Descargando archivo CSV...');
        const response = await axios.get(CSV_URL);
        const csvContent = response.data;

        if (csvContent.includes('<html')) {
            throw new Error('La URL no devolvió un CSV válido.');
        }

        console.log('2. Procesando datos y construyendo auditoría...');
        const { eventsToSend, auditTrail } = await processData(csvContent, headers);

        fs.writeFileSync('audit_log.json', JSON.stringify(auditTrail, null, 2));
        console.log(`✅ Archivo "audit_log.json" generado con ${auditTrail.length} registros detallados.`);

        if (eventsToSend.length > 0) {
            console.log(`3. Enviando lote de ${eventsToSend.length} eventos a Meta...`);
            await uploadToMeta(eventsToSend);
        }

    } catch (error) {
        console.error('❌ Error crítico:', error.message);
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
                if (row.em0 && row.em0.includes('@')) {
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
        const original = { 
            email: row.em0, 
            nombre: row.name, 
            telf: row.phone, 
            precio: row.price 
        };

        const cleanEmail = row.em0.trim().toLowerCase();
        const cleanPhone = row.phone.replace(/\D/g, '');
        const firstName = (row.name || '').split(' ')[0].trim().toLowerCase();
        const lastName = (row.name || '').split(' ').slice(1).join(' ').trim().toLowerCase();
        const cleanValue = parseFloat(row.price?.replace(/[^\d,.]/g, '').replace(',', '.') || 0);
        const currency = row.price?.includes('€') ? 'EUR' : 'USD';
        const eventTime = Math.floor(new Date(row.time).getTime() / 1000) || Math.floor(Date.now() / 1000);

        const hashedEmail = hashData(cleanEmail, 'em');
        const hashedPhone = hashData(cleanPhone, 'ph');
        const hashedFirstName = hashData(firstName);
        const hashedLastName = hashData(lastName);

        const event = {
            event_name: 'Purchase',
            event_time: eventTime,
            action_source: 'physical_store',
            user_data: {
                em: [hashedEmail],
                ph: [hashedPhone],
                fn: [hashedFirstName],
                ln: [hashedLastName],
                zp: [hashData(row.zip)],
                country: [hashData(row.country)],
                gen: [hashData(row.gender?.toLowerCase().startsWith('f') ? 'f' : 'm')],
                madid: [hashData(row.madid)]
            },
            custom_data: {
                value: cleanValue,
                currency: currency
            }
        };

        const audit = {
            evento_nro: index,
            dato_recibido: original,
            dato_transformado: { 
                email: cleanEmail, 
                nombre: firstName, 
                telf: cleanPhone, 
                valor: cleanValue 
            },
            peticion_meta: event 
        };

        return { audit, event };
    } catch (e) {
        return null;
    }
}

async function uploadToMeta(events) {
    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;
    try {
        const res = await axios.post(url, { data: events }, {
            params: { access_token: ACCESS_TOKEN }
        });
        console.log('🚀 ÉXITO: Meta recibió los eventos correctamente.');
        console.log('FB Trace ID:', res.data.fbtrace_id);
    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error('❌ Error API Meta:', msg);
    }
}

run();