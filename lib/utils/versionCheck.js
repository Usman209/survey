// versionUtils.js
function checkAppVersion(versionNo) {
  // Define allowed versions inside the function
  const allowedVersions = [process.env.APPVERSIONNO];  // Add the allowed versions here

  // Ensure all versions in the allowedVersions array are strings
  const formattedVersions = allowedVersions.map(version => 
    typeof version === 'number' ? version.toString() : version
  );

  // Return true if versionNo is in formattedVersions
  return formattedVersions.includes(versionNo);
}

module.exports = {
  checkAppVersion
};
