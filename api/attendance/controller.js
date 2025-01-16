const Attendance = require("../../lib/schema/attendance.schema");
const User = require("../../lib/schema/users.schema");  

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

      console.log(req.body)
      const { userData, qrCodeData } = req.body;
  
      // 1. Validate the QR code start and end time
      const currentDateTime = moment();
      const qrStartDateTime = moment(qrCodeData.startDate + " " + qrCodeData.startTime);
      const qrEndDateTime = moment(qrCodeData.endDate + " " + qrCodeData.endTime);
  
      if (currentDateTime.isBefore(qrStartDateTime)) {
        return res.status(400).json({ message: "Attendance cannot be marked before the start time." });
      }
  
      if (currentDateTime.isAfter(qrEndDateTime)) {
        return res.status(400).json({ message: "Attendance cannot be marked after the end time." });
      }
  
      if (qrCodeData.type === "campinge" && userData.userUc !== qrCodeData.QrUc) {
        return res.status(400).json({ message: "User UC does not match QR code UC. Attendance cannot be marked." });
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
          deviceTime: userData.deviceTime,
          userId: userData.userId,
          attendanceTime: moment().format("HH:mm:ss"), // Set the current attendance time
          attendanceDate: moment().format("YYYY-MM-DD"), // Set the current attendance date
          userUc: userData.userUc,  // Include user UC
          extraInfo: userData.extraInfo || {},
        },
        qrCodeData: {
          locationName: qrCodeData.locationName,
          QrUc: qrCodeData.QrUc,  // Include QR code UC
          location: qrCodeData.location,
          startDate: qrCodeData.startDate,
          endDate: qrCodeData.endDate,
          startTime: qrCodeData.startTime,
          endTime: qrCodeData.endTime,
          type: qrCodeData.type || "campinge",  
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