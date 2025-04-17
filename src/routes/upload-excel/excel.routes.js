const express = require('express');
const multer = require('multer');
const { handleUpload } = require('../../controllers/upload-excel/excel.controller');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), handleUpload);

module.exports = router;
