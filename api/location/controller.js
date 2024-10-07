const { errReturned, sendResponse } = require('../../lib/utils/dto');
const Location = require('../../lib/schema/location.schema'); // Adjust the path as needed


exports.saveLocation = async (req, res) => {
    try {
        const { userId, latitude, longitude, timestamp } = req.body;
        
        const location = new Location({ userId, latitude, longitude, timestamp });
        await location.save();
        
        res.status(201).json({ message: 'Location saved successfully', location });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error saving location', error });
    }
};