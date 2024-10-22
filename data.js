const mongoose = require("mongoose");

const DB_URI = 'mongodb+srv://bobojo4221:bGvxmeL2vIpYOqXa@cluster0.dor2y.mongodb.net/polio';

const { Schema } = mongoose;

const TehsilORTown = new Schema(
  {
    name: { type: String, required: true, unique: true }, 
  },
  { timestamps: true }
);

const UC  = mongoose.model("TehsilORTown", TehsilORTown);


// Data to insert
const ucData = [
    "ALLAMA IQBAL TOWN",
  "AZIZ BHATTI TOWN",
   "CANTT",
   "DATA GUNJBUX TOWN",
   "GULBERG TOWN",
   "NISHTER TOWN",
  "RAVI TOWN",
   "SAMANABAD TOWN",
   "SHALIMAR TOWN"
];

// Connect to MongoDB and insert data
mongoose.connect(DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const formattedData = ucData.map(name => ({
        name,
        // ucNumber is omitted
      }));

      await UC.insertMany(formattedData);
      
    } catch (error) {
      console.error("Error inserting data:", error);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch(err => {
    console.error("Error connecting to MongoDB:", err);
  });
