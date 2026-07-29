// helpers/sequenceHelper.js
const Sequence = require('../model/SequenceModel');

async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Sequence.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return sequenceDocument.sequence_value;
}

module.exports = { getNextSequenceValue };