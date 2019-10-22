import App from './app'
import MeasurementController from './controllers/measurementcontroller'
import AuthenticationController from './controllers/authenticationcontroller'
const dotenv = require('dotenv')
dotenv.config()
const port: number = parseInt(`${process.env.PORT}`, 10) || 3000

const app = new App(
  [new MeasurementController(), new AuthenticationController()],
  port,
)
app.listen()
