import App from './app'
import MeasurementController from './controllers/measurementcontroller'

const app = new App([new MeasurementController()], 3000)
app.listen()
