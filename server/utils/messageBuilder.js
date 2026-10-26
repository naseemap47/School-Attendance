/**
 * Builds a polite, clear notification message for parents when a student is absent.
 * 
 * @param {Object} params
 * @param {string} params.parentName - Name of the parent
 * @param {string} params.studentName - Name of the student
 * @param {string} params.className - Class or batch name
 * @param {string} params.date - Attendance date (YYYY-MM-DD)
 * @returns {string} Formatted WhatsApp message body
 */
function buildAbsenceMessage({ parentName, studentName, className, date }) {
  const pName = parentName && parentName.trim() ? parentName.trim() : 'Parent';
  const sName = studentName && studentName.trim() ? studentName.trim() : 'Student';
  const cName = className && className.trim() ? className.trim() : 'Class';
  const dStr = date || new Date().toISOString().split('T')[0];

  return `Dear ${pName},\n\nThis is an automated notification from School Attendance to inform you that your child *${sName}* was marked *ABSENT* from *${cName}* today (${dStr}).\n\nIf this was unexpected or if you have already submitted a leave request, please contact the school administration.\n\nThank you,\nSchool Administration`;
}

module.exports = {
  buildAbsenceMessage
};
