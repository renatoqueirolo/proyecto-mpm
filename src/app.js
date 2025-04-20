require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const fileUpload = require('express-fileupload');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(fileUpload());

app.use('/', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


module.exports = app;