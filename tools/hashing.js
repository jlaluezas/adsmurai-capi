const crypto = require('crypto');

function hashData(data, type = '') {
    if (!data) return null;

    let normalized = String(data).trim().toLowerCase();

    if (type === 'ph') {
        normalized = normalized.replace(/\D/g, '');
    } else if (type === 'em') {
    }

    return crypto.createHash('sha256').update(normalized).digest('hex');
}

module.exports = { hashData };