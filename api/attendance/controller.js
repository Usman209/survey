const Attendance = require("../../lib/schema/attendance.schema");
const User = require("../../lib/schema/users.schema");
const moment = require("moment");

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

      // Extract date and time from userData.attendanceTimeStamp
      const attendanceDate = moment(userData.attendanceTimeStamp).format('YYYY-MM-DD');
      const attendanceTime = moment(userData.attendanceTimeStamp).format('HH:mm:ss');

      console.log("Extracted Date:", attendanceDate);  // Outputs: 2025-01-16
      console.log("Extracted Time:", attendanceTime);  // Outputs: 14:05:26

      // Check if the attendance time falls within the QR code's start and end time
      const qrStartDateTime = moment(qrCodeData.timestamp).set({
          hour: moment(qrCodeData.startTime).hour(),
          minute: moment(qrCodeData.startTime).minute(),
          second: moment(qrCodeData.startTime).second(),
      });

      const qrEndDateTime = moment(qrCodeData.timestamp).set({
          hour: moment(qrCodeData.endTime).hour(),
          minute: moment(qrCodeData.endTime).minute(),
          second: moment(qrCodeData.endTime).second(),
      });

      const attendanceDateTime = moment(attendanceDate + " " + attendanceTime);

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

      // 5. Create the new attendance record
      const newAttendance = new Attendance({
          userData: {
              userLocation: userData.userLocation,
              attendanceTimeStamp: userData.attendanceTimeStamp, // Now using `attendanceTimeStamp`
              userId: userData.userId,
              attendanceTime: moment().format("HH:mm:ss"), // Set the current attendance time
              attendanceDate: moment().format("YYYY-MM-DD"), // Set the current attendance date
              userUc: userData.userUc,  // Include user UC
              extraInfo: userData.extraInfo || {},
          },
          qrCodeData: {
              locationName: qrCodeData.locationName || "Unknown Location",
              QrUc: qrCodeData.ucmoId,  // Include QR code UC
              location: qrCodeData.location,
              startDate: moment(qrCodeData.timestamp).format('YYYY-MM-DD'), // Use date from QR timestamp
              startTime: qrCodeData.startTime || "00:00:00",  // Default time if not provided
              endTime: qrCodeData.endTime || "23:59:59",  // Default time if not provided
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
