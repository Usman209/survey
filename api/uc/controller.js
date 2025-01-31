// controllers/ucController.js
const Uc = require("../../lib/schema/uc.schema");
const { sendResponse, errReturned } = require("../../lib/utils/dto");


// Create a new uc
exports.createUc = async (req, res) => {
  try {
    const uc = new Uc(req.body);
    const savedUc = await uc.save();
    return sendResponse(res, 201, "Uc created successfully.", savedUc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Get all ucs
exports.getAllUcs = async (req, res) => {
  try {
    const ucs = await Uc.find();
    
    // Modify the 'name' field to remove 'UC' and the space
    const modifiedUcs = ucs.map(uc => ({
      ...uc.toObject(),  // convert to plain object if it's a mongoose document
      name: uc.name.replace('UC ', '')  // Remove 'UC ' from the name
    }));

    return sendResponse(res, 200, "Ucs retrieved successfully.", modifiedUcs);
  } catch (error) {
    return errReturned(res, error.message);
  }
};



exports.getAllUcs1 = async (req, res) => {
  try {
    // Fetch all UCs from the database
    const ucs = await Uc.find();

    // Define the allLocations array with location codes
    const allLocations =[
      // AllamaIqbal
      "110A", "110B", "111", "112A", "112B", "113", "114", "116A", "116B", "116C", 
      "117A", "117B", "117C", "118A", "118B", "118C", "119A", "119B", "119C", 
      "120A", "120B", "120C", "120D", "120E", "120F", "120G", "120H", "121A", 
      "121B", "122A", "122B", "122C", "122D", "122E", "123A", "123B", "124A", 
      "124B", "125A", "125B", "132P", "133P", "148A", "148B", "148C", "149A", 
      "149B", "151P",
    
      // AzizBhatti
      "41A", "41B", "43A", "43B", "44A", "44B", "45", "48", "54", "55", "56", 
      "57A", "57B", "58", "59", "60A", "60B", "60C", "61A", "61B",
    
      // Cantt
      "C1", "C2", "C3A", "C3B", "C4A", "C4B", "C5A", "C5B", "C6A", "C6B", 
      "W1A", "W1B", "W2", "W3A", "W3B", "W4A", "W4B", "W5A", "W5B", "W6", 
      "W7A", "W7B", "W8A", "W8B", "W9A", "W9B", "W9C", "W9D",
    
      // DGBZ
      "68", "70", "67A", "67B", "68A", "68B", "68C", "68D", "69A", "69B", 
      "70", "70A", "70B", "70C", "70D", "71A", "71B", "71C", "71D", 
      "72", "72A", "72B", "72C", "72D", "73", "73A", "73B", "74", "74A", 
      "74B", "74C", "77", "77A", "77B", "77C", "78", "78A", "78B", "78C", 
      "78D", "78E", "79", "79A", "79B", "79C", "80", "80A", "80B", "80C", 
      "81", "82", "81A", "81B", "81C", "81D", "82A", "82B", "82C", "82D", 
      "83A", "83B", "85", "85B", "85C", "86", "86A", "86C", "94", "94A", 
      "94B", "94C",
    
      // Gulberg
      "126A", "31", "126B", "127", "127A", "127B", "127C", "127D", "128A", 
      "128B", "128C", "128D", "128E", "129A", "129B", "130A", "130", "130B", 
      "130C", "130D", "131A", "131B", "31A", "31B", "31C", "31D", "31E", 
      "32A", "32B", "32C", "32", "32D", "75A", "75", "76", "75B", "75C", 
      "75D", "75E", "75F", "76A", "76B", "76C", "95A", "95B", "95C", "95D", 
      "95E", "95", "96A", "96", "97", "96B", "96C", "96D", "97A", "97B", 
      "97C", "97D", "97E", "98A", "98B", "99A", "99B",
    
      // Nishter
      "134A", "134", "134B", "135A", "135B", "136A", "136B", "137A", "137B", 
      "138A", "138", "139A", "139", "140A", "140B", "141A", "141B", "141C", 
      "141D", "142A", "142B", "143A", "143B", "143C", "143D", "144A", "144B", 
      "144C", "144D", "144E", "145A", "145B", "145C", "146A", "146B", "147A", 
      "147B", "150A", "150B", "63A", "63B", "63C", "63D", "64A", "64B", "66A", 
      "66B",
    
      // Ravi
      "6", "3", "7", "9", "10", "11", "12", "13", "26", "27", "28", "29", "30", 
      "1A", "1B", "2A", "2B", "3A", "4A", "4B", "5A", "5B", "6A", "7A", "8A", 
      "8B", "9A", "10A", "11A", "12A", "13A", "14A", "14B", "26A", "27A", 
      "28A", "29A", "30A",
    
      // Samanabad
      "84A", "84B", "87A", "88A", "89A", "90A", "90B", "91A", "92A", "93A", 
      "100A", "101A", "102A", "103A", "104A", "105A", "106A", "107A", "108A", 
      "109A", "109B", "115A", "87", "88", "89", "91", "92", "93", "100", "101", 
      "102", "103", "104", "105", "106", "107", "108", "115",
    
      // Shalimar
      "15P", "15A", "15B", "15C", "16AP", "16AA", "16AB", "16BC", "16BD", 
      "16BE", "16CF", "16CG", "16CH", "17P", "17A", "17B", "18P", "18A", 
      "18B", "18C", "19P", "19A", "19B", "19C", "20P", "20A", "20B", "21P", 
      "21A", "21B", "21C", "16B", "16C", "22", "23", "24", "25", "33", "34", 
      "35A", "35B", "35C", "36A", "36B", "46", "47",
    
      // Wahga
      "37A", "37B", "38", "39A", "39B", "40A", "40B", "42", "49A", "49B", 
      "50A", "50B", "51A", "51B", "52A", "52B", "52C", "52D", "53A", "53B", 
      "62A", "62B", "62C", "65A", "65B",

      "132",
      "133",
      "151",
      "71",
      "128",
      "15",
      "16A",
      "17",
      "18",
      "19",
      "20",
      "21"
    ];

    // Filter UCs whose names do not exist in the allLocations array
    const ucsNotInLocations = ucs
      .filter(uc => !allLocations.includes(uc.name))
      .map(uc => uc.name); // Only return the name of the UC

    // Return response with just the names of UCs not found in locations
    return sendResponse(res, 200, "Ucs retrieved successfully.", ucsNotInLocations);
  } catch (error) {
    return errReturned(res, error.message);
  }
};


exports.getUcsInLocationsButNotInDb = async (req, res) => {
  try {
    // Fetch all UCs from the database
    const ucs = await Uc.find();

    // Extract names of UCs from the database
    const ucsInDb = ucs.map(uc => uc.name);

    // Define the allLocations array with location codes
    const allLocations = [
      "110A", "110B", "111", "112A", "112B", "113", "114", "116A", "116B", "116C", "117A", "117B", "117C", "118A", "118B", "118C", "119A", "119B", "119C", "120A", "120B", "120C", "120D", "120E", "120F", "120G", "120H", "121A", "121B", "122A", "122B", "122C", "122D", "122E", "123A", "123B", "124A", "124B", "125A", "125B", "132", "133", "148A", "148B", "148C", "149A", "149B", "151", 
      "41A", "41B", "43A", "43B", "44A", "44B", "45", "48", "54", "55", "56", "57A", "57B", "58", "59", "60A", "60B", "60C", "61A", "61B",
      "C1A", "C2A", "C3A", "C3B", "C4A", "C4B", "C5A", "C5B", "C6A", "C6B", "W1A", "W1B", "W2A", "W3A", "W3B", "W4A", "W4B", "W5A", "W5B", "W6", "W7A", "W7B", "W8A", "W8B", "W9A", "W9B", "W9C", "W9D",
      "67A", "67B", "68A", "68B", "68C", "68D", "69A", "69B", "70A", "70B", "70C", "70D", "71A", "71B", "71C", "71D", "72A", "72B", "72C", "72D", "73", "73A", "73B", "74A", "74B", "74C", "77A", "77B", "77C", "78A", "78B", "78C", "78D", "78E", "79", "79A", "79B", "79C", "80", "80A", "80B", "80C", "81A", "81B", "81C", "81D", "82A", "82B", "82C", "82D", "83A", "83B", "85", "85B", "85C", "86", "86A", "86C", "94", "94A", "94B", "94C",
      "126A", "126B", "127A", "127B", "127C", "127D", "128A", "128B", "128C", "128D", "128E", "129A", "129B", "130A", "130B", "130C", "130D", "131A", "131B", "31A", "31B", "31C", "31D", "31E", "32A", "32B", "32C", "32D", "75A", "75B", "75C", "75D", "75E", "75F", "76A", "76B", "76C", "95A", "95B", "95C", "95D", "95E", "96A", "96B", "96C", "96D", "97A", "97B", "97C", "97D", "97E", "98A", "98B", "99A", "99B",
      "134A", "134B", "135A", "135B", "136A", "136B", "137A", "137B", "138A", "139A", "140A", "140B", "141A", "141B", "141C", "141D", "142A", "142B", "143A", "143B", "143C", "143D", "144A", "144B", "144C", "144D", "144E", "145A", "145B", "145C", "146A", "146B", "147A", "147B", "150A", "150B", "63A", "63B", "63C", "63D", "64A", "64B", "66A", "66B",
      "1A", "1B", "2A", "2B", "3A", "4A", "4B", "5A", "5B", "6A", "7A", "8A", "8B", "9A", "10A", "11A", "12A", "13A", "14A", "14B", "26A", "27A", "28A", "29A", "30A",
      "84A", "84B", "87A", "88A", "89A", "90A", "90B", "91A", "92A", "93A", "100A", "101A", "102A", "103A", "104A", "105A", "106A", "107A", "108A", "109A", "109B", "115A",
      "15", "15A", "15B", "15C", "16A", "16AA", "16AB", "16BC", "16BD", "16BE", "16CF", "16CG", "16CH", "17", "17A", "17B", "18", "18A", "18B", "18C", "19", "19A", "19B", "19C", "20", "20A", "20B", "21", "21A", "21B", "21C"
  ];

    // Find locations that are in allLocations but not in the database (i.e., missing from the UCs)
    const locationsNotInDb = allLocations.filter(location => !ucsInDb.includes(location));

    // Return the missing locations as an array
    return sendResponse(res, 200, "Locations found in allLocations but not in DB.", locationsNotInDb);
  } catch (error) {
    return errReturned(res, error.message);
  }
};





// Get a single uc by ID
exports.getUcById = async (req, res) => {
  try {
    const uc = await Uc.findById(req.params.id).populate('division');
    if (!uc) return errReturned(res, "Uc not found.");
    return sendResponse(res, 200, "Uc retrieved successfully.", uc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Update a uc by ID
exports.updateUc = async (req, res) => {
  try {
    const updatedUc = await Uc.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedUc) return errReturned(res, "Uc not found.");
    return sendResponse(res, 200, "Uc updated successfully.", updatedUc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};

// Delete a uc by ID
exports.deleteUc = async (req, res) => {
  try {
    const deletedUc = await Uc.findByIdAndDelete(req.params.id);
    if (!deletedUc) return errReturned(res, "Uc not found.");
    return sendResponse(res, 200, "Uc deleted successfully.", deletedUc);
  } catch (error) {
    return errReturned(res, error.message);
  }
};
