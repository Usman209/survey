const multer = require( 'multer' );
const path = require( 'path' );

const storage = multer.diskStorage( {
  destination: './uploads/',
  filename: function ( req, file, cb )
  {
    const extension = path.extname( file.originalname ).toLowerCase();
    const uniqueFileName = `${Date.now()}-mandy${extension}`;
    cb( null, uniqueFileName );
  }
} );

const upload = multer( {
  storage: storage
} ).array( 'images' );


module.exports = upload;

