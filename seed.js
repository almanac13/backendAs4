const mongoose = require("mongoose");
require("dotenv").config();
const Measurement = require("./models/measurement");

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    await Measurement.deleteMany();

    const data = [];
    const startDate = new Date("2025-01-01T00:00:00.000Z");
    const today = new Date();

    let current = new Date(startDate);

    let temp = 10;
    let humidity = 55;

    while (current <= today) {
      const month = current.getUTCMonth();
      const dayOfWeek = current.getUTCDay();

      const seasonal = 12 * Math.sin((2 * Math.PI * (month - 1)) / 12);
      const targetTemp = 12 + seasonal;

      temp += (targetTemp - temp) * 0.15 + rand(-2, 2);
      temp = clamp(temp, -20, 45);

      const humidityTarget = 60 - (temp - 10) * 0.6 + rand(-5, 5);
      humidity += (humidityTarget - humidity) * 0.2 + rand(-3, 3);
      humidity = clamp(humidity, 15, 95);

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseTraffic = isWeekend ? 450 : 750;
      const seasonalTraffic = 120 * Math.sin((2 * Math.PI * (month - 8)) / 12);

      let traffic = baseTraffic + seasonalTraffic + rand(-180, 220);
      if (Math.random() < 0.05) traffic += rand(300, 900);
      traffic = clamp(traffic, 0, 2000);

      data.push({
        timestamp: new Date(current),
        field1: Math.round(temp),
        field2: Math.round(humidity),
        field3: Math.round(traffic)
      });

      current.setUTCDate(current.getUTCDate() + 1);
    }

    await Measurement.insertMany(data);
    console.log(`Seeded ${data.length} records`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
