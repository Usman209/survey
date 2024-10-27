const mongoose = require('mongoose');

const dbConnection = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            await mongoose.connect(process.env.DB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000 // Corrected property name
            });
            resolve();
        } catch (e) {
            return reject(e);
        }
    });
};

module.exports = { dbConnection };
