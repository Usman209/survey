const mongoose = require("mongoose");


const dbConnection = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            await mongoose.connect(process.env.DB_URI);
            resolve()
        } catch (e) {
            console.log('error in connection', e)
            return reject(e)
        }
    })
}

module.exports = {  dbConnection }