/**
 * Formats and normalizes a phone number to standard WhatsApp JID (<digits>@c.us).
 * Automatically cleans non-digits, strips leading zeros, and attaches the default country code if needed.
 * 
 * @param {string} phone - Raw input phone number
 * @param {string} defaultCountryCode - Default country code (default '91')
 * @returns {string} - WhatsApp JID e.g. "919876543210@c.us"
 */
function formatToWhatsAppJid(phone, defaultCountryCode = '91') {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    throw new Error('Phone number is required');
  }

  // Remove any non-digit characters
  let digits = phone.replace(/\D/g, '');

  if (!digits || digits.length < 7) {
    throw new Error(`Invalid phone number: "${phone}"`);
  }

  // If starts with 0 (common domestic trunk prefix), strip it
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
  }

  // If 10 digits (standard domestic length in India/US/etc), prefix with default country code
  if (digits.length === 10) {
    digits = `${defaultCountryCode}${digits}`;
  }

  return `${digits}@c.us`;
}

module.exports = {
  formatToWhatsAppJid
};
