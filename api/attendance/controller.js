const Attendance = require("../../lib/schema/attendance.schema");
const User = require("../../lib/schema/users.schema");
const mongoose = require("mongoose");
const moment = require('moment-timezone');




const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of
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

      // Get the current server time in Pakistan time (UTC +5)
      const currentServerTime = moment().tz('Asia/Karachi');
      console.log("Server Time:", currentServerTime.format());

      // Extract device timestamp from the user data and convert to PKT
      const userDeviceTime = moment(userData.attendanceTimeStamp).tz('Asia/Karachi');
      console.log("User Device Time:", userDeviceTime.format());

      // Calculate the difference between the server time and user device time
      const timeDifferenceInMinutes = currentServerTime.diff(userDeviceTime, 'minutes');
      console.log("Time Difference (in minutes):", timeDifferenceInMinutes);

      // If the device time is more than 5 minutes ahead or behind the server time, flag it
      if (Math.abs(timeDifferenceInMinutes) > 5) {
          return res.status(400).json({ message: "Your device time seems incorrect. Please sync it and try again." });
      }

      // Extract date and time from userData.attendanceTimeStamp
      const attendanceDate = userDeviceTime.format('YYYY-MM-DD');
      const attendanceTime = userDeviceTime.format('HH:mm:ss');
      console.log("Extracted Date:", attendanceDate);  // Outputs: 2025-02-19
      console.log("Extracted Time:", attendanceTime);  // Outputs: 14:05:26

      // Check if the attendance time falls within the QR code's start and end time
      const qrStartDateTime = moment(qrCodeData.timestamp).tz('Asia/Karachi').set({
          hour: moment(qrCodeData.startTime).hour(),
          minute: moment(qrCodeData.startTime).minute(),
          second: moment(qrCodeData.startTime).second(),
      });

      const qrEndDateTime = moment(qrCodeData.timestamp).tz('Asia/Karachi').set({
          hour: moment(qrCodeData.endTime).hour(),
          minute: moment(qrCodeData.endTime).minute(),
          second: moment(qrCodeData.endTime).second(),
      });

      const attendanceDateTime = moment(attendanceDate + " " + attendanceTime).tz('Asia/Karachi');

      console.log("QR Start DateTime:", qrStartDateTime.format());
      console.log("QR End DateTime:", qrEndDateTime.format());
      console.log("User Attendance DateTime:", attendanceDateTime.format());

      // Validate if the attendance time is within the allowed range
      if (attendanceDateTime.isBefore(qrStartDateTime)) {
          return res.status(400).json({ message: "Attendance cannot be marked before the start time." });
      }

      if (attendanceDateTime.isAfter(qrEndDateTime)) {
          return res.status(400).json({ message: "Attendance cannot be marked after the end time." });
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
      if (distance > 50) {
          return res.status(400).json({ message: "User is too far from the QR code location. Attendance cannot be marked." });
      }

      // Create the dynamic collection name based on the server's current date
      const collectionName = `attendance_${currentServerTime.format('YYYY-MM-DD')}`;

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
              attendanceTimeStamp: userDeviceTime.toDate(), // Use the corrected PKT time
              userId: userData.userId,
              attendanceTime: currentServerTime.format("HH:mm:ss"), // Set the current attendance time in PKT
              attendanceDate: currentServerTime.format("YYYY-MM-DD"), // Set the current attendance date in PKT
              userUc: userData.userUc,  // Include user UC
              extraInfo: userData.extraInfo || {},
          },
          qrCodeData: {
              locationName: qrCodeData.locationName || "Unknown Location",
              QrUc: qrCodeData.ucmoId,  // Include QR code UC
              location: qrCodeData.location,
              startDate: moment(qrCodeData.timestamp).tz('Asia/Karachi').format('YYYY-MM-DD'), // Use date from QR timestamp in PKT
              startTime: moment(qrCodeData.startTime).tz('Asia/Karachi').format('HH:mm:ss'),  // Convert to PKT
              endTime: moment(qrCodeData.endTime).tz('Asia/Karachi').format('HH:mm:ss'),  // Convert to PKT
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
