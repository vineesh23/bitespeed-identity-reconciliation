const { Op } = require('sequelize');
const Contact = require('../models/Contact');
const sequelize = require('../config/database');

const formatResponse = (primaryId, contacts) => {
  const emails = [...new Set(contacts.map(c => c.email).filter(Boolean))];
  const phoneNumbers = [...new Set(contacts.map(c => c.phoneNumber).filter(Boolean))];
  const secondaryContactIds = contacts
    .filter(c => c.linkPrecedence === 'secondary')
    .map(c => c.id);

  return {
    contact: {
      primaryContatctId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds
    }
  };
};

const reconcileIdentity = async (email, phoneNumber) => {
  return await sequelize.transaction(async (t) => {
    const matchingContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          email ? { email } : null,
          phoneNumber ? { phoneNumber } : null
        ].filter(Boolean)
      },
      transaction: t
    });

    if (matchingContacts.length === 0) {
      const newContact = await Contact.create({
        email,
        phoneNumber,
        linkPrecedence: 'primary'
      }, { transaction: t });

      return formatResponse(newContact.id, [newContact]);
    }

    const primaryIds = new Set(
      matchingContacts.map(c => c.linkPrecedence === 'primary' ? c.id : c.linkedId)
    );

    let primaryContacts = await Contact.findAll({
      where: { id: Array.from(primaryIds) },
      order: [['createdAt', 'ASC']],
      transaction: t
    });

    const rootPrimary = primaryContacts[0];

    if (primaryContacts.length > 1) {
      for (let i = 1; i < primaryContacts.length; i++) {
        const newerPrimary = primaryContacts[i];
        
        await Contact.update(
          { linkedId: rootPrimary.id, linkPrecedence: 'secondary' },
          { where: { id: newerPrimary.id }, transaction: t }
        );

        await Contact.update(
          { linkedId: rootPrimary.id },
          { where: { linkedId: newerPrimary.id }, transaction: t }
        );
      }
    }

    const emailExists = matchingContacts.some(c => c.email === email);
    const phoneExists = matchingContacts.some(c => c.phoneNumber === phoneNumber);

    if (email && phoneNumber && (!emailExists || !phoneExists)) {
      await Contact.create({
        email,
        phoneNumber,
        linkedId: rootPrimary.id,
        linkPrecedence: 'secondary'
      }, { transaction: t });
    }

    const familyContacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { id: rootPrimary.id },
          { linkedId: rootPrimary.id }
        ]
      },
      order: [['createdAt', 'ASC']],
      transaction: t
    });

    return formatResponse(rootPrimary.id, familyContacts);
  });
};

module.exports = { reconcileIdentity };