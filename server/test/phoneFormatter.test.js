const { test, describe } = require('node:test');
const assert = require('node:assert');
const { formatToWhatsAppJid } = require('../utils/phoneFormatter.js');
const { buildAbsenceMessage } = require('../utils/messageBuilder.js');

describe('Phone Number Formatter & WhatsApp Message Builder', () => {
  describe('formatToWhatsAppJid', () => {
    test('formats a 10-digit phone number with default country code 91', () => {
      const result = formatToWhatsAppJid('9876543210');
      assert.strictEqual(result, '919876543210@c.us');
    });

    test('strips spaces, dashes, brackets, and leading plus sign', () => {
      const result = formatToWhatsAppJid('+91 (987) 654-3210');
      assert.strictEqual(result, '919876543210@c.us');
    });

    test('retains international numbers that already include country code', () => {
      const result = formatToWhatsAppJid('+1 415 555 2671', '91');
      assert.strictEqual(result, '14155552671@c.us');
    });

    test('handles phone with leading 0 by stripping it and prefixing country code', () => {
      const result = formatToWhatsAppJid('09876543210', '91');
      assert.strictEqual(result, '919876543210@c.us');
    });

    test('throws Error on invalid/short phone number', () => {
      assert.throws(() => formatToWhatsAppJid('12345'), /Invalid phone number/);
      assert.throws(() => formatToWhatsAppJid(''), /Phone number is required/);
      assert.throws(() => formatToWhatsAppJid(null), /Phone number is required/);
    });
  });

  describe('buildAbsenceMessage', () => {
    test('constructs polite personalized absence message with student and class details', () => {
      const msg = buildAbsenceMessage({
        parentName: 'Mr. Sharma',
        studentName: 'Aarav Sharma',
        className: 'Grade 10 - A',
        date: '2026-10-26'
      });

      assert.ok(msg.includes('Dear Mr. Sharma'));
      assert.ok(msg.includes('Aarav Sharma'));
      assert.ok(msg.includes('Grade 10 - A'));
      assert.ok(msg.includes('2026-10-26'));
      assert.ok(msg.includes('ABSENT'));
    });
  });
});
