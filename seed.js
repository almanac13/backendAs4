const mongoose = require("mongoose");
require("dotenv").config();
const Measurement = require("../models/Measurement");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await Measurement.deleteMany(); // clear old data

    const data = [];
    const startDate = new Date("2024-01-01");

    for (let i = 0; i < 50; i++) {
      data.push({
        timestamp: new Date(startDate.getTime() + i * 86400000), // +1 day
        field1: Math.floor(Math.random() * 100),
        field2: Math.floor(Math.random() * 50) + 10,
        field3: Math.floor(Math.random() * 200)
      });
    }

    await Measurement.insertMany(data);
    console.log("✅ Data seeded successfully");

    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
