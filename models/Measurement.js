const mongoose = require("mongoose");

const measurementSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  field1: { type: Number },
  field2: { type: Number },
  field3: { type: Number }
});

module.exports = mongoose.model("Measurement", measurementSchema);
