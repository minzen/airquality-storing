import App from './app'
import MeasurementController from './controllers/measurementcontroller'
const dotenv = require('dotenv')
dotenv.config()
const port: number = parseInt(`${process.env.PORT}`, 10) || 3000

const app = new App([new MeasurementController()], port)
app.listen()
