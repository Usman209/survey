const Attendance = require("../../lib/schema/attendance.schema");
const User = require("../../lib/schema/users.schema");
const moment = require("moment");

// Haversine formula to calculate the distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
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

    console.log(req.body);  // To check what data is received in the body

    // Parse times and dates using moment.js
    const attendanceTime = moment(userData.attendanceTime, 'HH:mm:ss');
    const attendanceDate = moment(userData.attendanceDate, 'YYYY-MM-DD');
    const qrStartTime = moment(qrCodeData.startTime);
    const qrEndTime = moment(qrCodeData.endTime);
    const qrCodeTimestamp = moment(qrCodeData.timestamp);

    // 1. Check if attendance date matches QR code timestamp date
    if (!attendanceDate.isSame(qrCodeTimestamp, 'day')) {
      return res.status(400).json({ message: "Attendance date does not match QR code date." });
    }

    // 2. Check if attendance time is within the valid time window defined by startTime and endTime
    if (attendanceTime.isBefore(qrStartTime) || attendanceTime.isAfter(qrEndTime)) {
      return res.status(400).json({ message: "Attendance time is outside the allowed time window." });
    }

    // 3. Check if the user exists
    const user = await User.findById(userData.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 4. Validate the UC (user UC vs QR code UC)
    if (userData.userUc !== qrCodeData.ucmoId) {
      return res.status(400).json({ message: "User UC does not match QR code UC. Attendance cannot be marked." });
    }

    // 5. Validate the distance between user location and QR code location
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

    // 6. Create the new attendance record
    const newAttendance = new Attendance({
      userData: {
        userLocation: userData.userLocation,
        deviceTime: userData.deviceTime, // Added device time from user data
        userId: userData.userId,
        attendanceTime: userData.attendanceTime, // Time received from the user data
        attendanceDate: userData.attendanceDate, // Date received from the user data
        userUc: userData.userUc,  // Include user UC
        extraInfo: userData.extraInfo || {},  // If there are any extra user data
      },
      qrCodeData: {
        ucmoId: qrCodeData.ucmoId,  // Include QR code UC (ucmoId)
        location: qrCodeData.location,
        timestamp: qrCodeData.timestamp,
        startTime: qrCodeData.startTime,
        endTime: qrCodeData.endTime,
        type: qrCodeData.type || "attendance",  // Default to attendance if no type is provided
      },
      remarks: req.body.remarks || "Attendance marked via QR scan", // If there are any remarks provided
      extraInfo: req.body.extraInfo || {},  // Any other extra information
    });

    // 7. Save the attendance data
    const savedAttendance = await newAttendance.save();

    // 8. Send success response
    return res.status(201).json({
      message: "Attendance marked successfully.",
      attendance: savedAttendance,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({ message: "An error occurred while marking attendance." });
  }
};
