  exports.DB_Tables = Object.freeze({
      USER: 'Users',
      TEAM:'Team',
      CAMPAIGN:'Campaign',
      TEHSIL: 'Tehsil',
      DIVISION: 'Division',
      UC: 'UC',
      DISTRICT: 'Distrct',
      TERRITORY: "Territory"
  })
  exports.EUserRole = Object.freeze({

    ADMIN: 'ADMIN',
    FLW: 'FLW',
    AIC: 'AIC',
    UCMO: 'UCMO',
});

  exports.EResponseCode = Object.freeze({
      SUCCESS: 200,
      BADREQUEST: 400,
      NOTFOUND: 404,
      INVALID: 422,
      UNAUTHORIZED: 401,
      CONFLICT: 409,
      INTERNALSERVERERROR: 500,
  })

  exports.UserStatus = Object.freeze({
      ACTIVE: 'ACTIVE',
      INACTIVE: 'INACTIVE',
      SUSPENDED: 'SUSPENDED',
      CLOSED: 'CLOSED',
  })

  exports.DeleteStatus = Object.freeze({
      ACTIIVE: 'ACTIIVE',
      SOFT_DELETE: 'SOFT_DELETE',
      HARD_DELETE: 'HARD_DELETE',
  })

  exports.EChatStatus = Object.freeze({
      ACTIIVE: 'ACTIIVE',
      INACTIIVE: 'INACTIIVE',

  })