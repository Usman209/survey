const Attendance = require("../../lib/schema/attendance.schema");
const User = require("../../lib/schema/users.schema");
const moment = require("moment-timezone"); // Import moment-timezone
const mongoose = require("mongoose");

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance * 1000; // Convert to meters
};

exports.createAttendance = async (req, res) => {
  try {
      const { userData, qrCodeData } = req.body;

      // Get the current date in Pakistan Standard Time (PST)
      const currentDate = moment().tz("Asia/Karachi").format('YYYY-MM-DD'); // Current date in PST
      console.log("Current Date in PST:", currentDate);

      // Extract the date from the user's attendance timestamp in PST
      const attendanceDate = moment(userData.attendanceTimeStamp).tz("Asia/Karachi").format('YYYY-MM-DD');
      console.log("Extracted Attendance Date in PST:", attendanceDate);

      // Extract the date from the QR code timestamp in PST
      const qrDate = moment(qrCodeData.timestamp).tz("Asia/Karachi").format('YYYY-MM-DD');
      console.log("QR Code Date in PST:", qrDate);

      if (qrDate !== currentDate) {
        return res.status(400).json({ message: "The QR code date does not match today's date. Please check the QR code." });
      }
  
      // If the user's attendance date is not today
      if (attendanceDate !== currentDate) {
        return res.status(400).json({ message: "Your attendance date does not match today's date. Please check your data." });
      }




      // Check if the attendance date matches the QR code date
      if (attendanceDate !== qrDate) {
          return res.status(400).json({ message: "Attendance date does not match QR code date." });
      }

      // 3. Check if the user exists
      const user = await User.findById(userData.userId);
      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

      // 4. Validate the distance between user location and QR code location
      const distance = calculateDistance(
          userData.userLocation.latitude,
          userData.userLocation.longitude,
          qrCodeData.location.latitude,
          qrCodeData.location.longitude
      );

      // If the distance is more than 50 meters, do not allow attendance marking
      if (distance > 500) {
          return res.status(400).json({ message: "User is too far from the QR code location. Attendance cannot be marked." });
      }

      // Create the dynamic collection name based on the current date
      const collectionName = `attendance_${currentDate}`;

      // Check if the collection exists (by listing collections in the database)
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionExists = collections.some(collection => collection.name === collectionName);

      // Define the model dynamically based on the collection existence
      let DynamicAttendance;
      if (collectionExists) {
          // If collection exists, use the existing model
          DynamicAttendance = mongoose.model(collectionName, Attendance.schema);
      } else {
          // If collection doesn't exist, create a new model for today's date
          DynamicAttendance = mongoose.model(collectionName, Attendance.schema);
      }

      // 5. Create the new attendance record
      const newAttendance = new DynamicAttendance({
          userData: {
              userLocation: userData.userLocation,
              attendanceTimeStamp: userData.attendanceTimeStamp, // Now using `attendanceTimeStamp`
              userId: userData.userId,
              attendanceTime: moment().tz("Asia/Karachi").format("HH:mm:ss"), // Set the current attendance time in PST
              attendanceDate: moment().tz("Asia/Karachi").format("YYYY-MM-DD"), // Set the current attendance date in PST
              userUc: userData.userUc,  // Include user UC
              extraInfo: userData.extraInfo || {},
          },
          qrCodeData: {
              locationName: qrCodeData.locationName || "Unknown Location",
              QrUc: qrCodeData.ucmoId,  // Include QR code UC
              location: qrCodeData.location,
              startDate: moment(qrCodeData.timestamp).tz("Asia/Karachi").format('YYYY-MM-DD'), // Use date from QR timestamp in PST
              type: qrCodeData.type || "campaign",  
              extraInfo: qrCodeData.extraInfo || {},
          },
          remarks: req.body.remarks || "", // If there are any remarks provided
          slug: req.body.slug || "", // If there is any slug provided
          extraInfo: req.body.extraInfo || {},  // Any other extra information
      });

      // 6. Save the attendance data
      const savedAttendance = await newAttendance.save();

      // 7. Send success response
      return res.status(201).json({
          message: "Attendance marked successfully.",
          attendance: savedAttendance,
      });
  } catch (error) {
      console.error("Error marking attendance:", error);
      return res.status(500).json({ message: "An error occurred while marking attendance." });
  }
};
