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
  
      // 1. Get the current date in Pakistan Standard Time (Asia/Karachi)
      const currentDate = moment().tz("Asia/Karachi").format('YYYY-MM-DD');
      console.log("Current Date in PST:", currentDate);
  
      // 2. Extract the date directly from the original timestamps (in UTC)
      const attendanceDate = moment.utc(userData.attendanceTimeStamp).format('YYYY-MM-DD');
      console.log("Extracted Attendance Date (UTC):", attendanceDate);
  
      const qrDate = moment.utc(qrCodeData.timestamp).format('YYYY-MM-DD');
      console.log("QR Code Date (UTC):", qrDate);
  
      // 3. Check if QR code date matches today's date
      if (qrDate !== currentDate) {
        return res.status(400).json({ message: "The QR code date does not match today's date. Please check the QR code." });
      }
  
      // 4. Check if user's attendance date is today
      if (attendanceDate !== currentDate) {
        return res.status(400).json({ message: "Your attendance date does not match today's date. Please check your data." });
      }
  
      // 5. Check if attendance date matches QR code date
      if (attendanceDate !== qrDate) {
        return res.status(400).json({ message: "Attendance date does not match QR code date." });
      }
  
      // 6. Check if user exists
      const user = await User.findById(userData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      // 7. Validate the distance between user location and QR code location
      const distance = calculateDistance(
        userData.userLocation.latitude,
        userData.userLocation.longitude,
        qrCodeData.location.latitude,
        qrCodeData.location.longitude
      );
  
      if (distance > 500) {
        return res.status(400).json({ message: "User is too far from the QR code location. Attendance cannot be marked." });
      }
  
      // 8. Create the dynamic collection name based on the current date
      const collectionName = `attendance_${currentDate}`;
  
      // Check if the collection already exists
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionExists = collections.some(collection => collection.name === collectionName);
  
      // Define or use dynamic model
      let DynamicAttendance;
      if (collectionExists) {
        DynamicAttendance = mongoose.model(collectionName, Attendance.schema);
      } else {
        DynamicAttendance = mongoose.model(collectionName, Attendance.schema);
      }
  
      // 9. Create attendance record
      const newAttendance = new DynamicAttendance({
        userData: {
          userLocation: userData.userLocation,
          attendanceTimeStamp: userData.attendanceTimeStamp, // keep original
          userId: userData.userId,
          attendanceTime: moment().tz("Asia/Karachi").format("HH:mm:ss"), // time in PST
          attendanceDate: currentDate, // set based on current PST date
          userUc: userData.userUc,
          extraInfo: userData.extraInfo || {},
        },
        qrCodeData: {
          locationName: qrCodeData.locationName || "Unknown Location",
          QrUc: qrCodeData.ucmoId,
          location: qrCodeData.location,
          startDate: qrDate, // use original UTC date from QR code
          type: qrCodeData.type || "campaign",
          extraInfo: qrCodeData.extraInfo || {},
        },
        remarks: req.body.remarks || "",
        slug: req.body.slug || "",
        extraInfo: req.body.extraInfo || {},
        isProcessed: false,
      });
  
      // 10. Save attendance
      const savedAttendance = await newAttendance.save();
  
      // 11. Respond
      return res.status(201).json({
        message: "Attendance marked successfully.",
        attendance: savedAttendance,
      });
  
    } catch (error) {
      console.error("Error marking attendance:", error);
      return res.status(500).json({ message: "An error occurred while marking attendance." });
    }
  };
  
