import * as express from 'express'
import Measurement from './Measurement'

class MeasurementController {
  public path = '/measurements'
  public router = express.Router()

  private measurements: Measurement[] = [
    {
      date: new Date('2019-10-11T13:43:00'),
      temperature: 21.3,
      humidity: 55.4,
    }
  ]

  constructor() {
    this.initializeRoutes()
  }

  public initializeRoutes() {
    this.router.get(this.path, this.getAllMeasurements)
    this.router.post(this.path, this.createAMeasurement)
  }

  getAllMeasurements = (request: express.Request, response: express.Response) => {
      response.send(this.measurements)
  }

  createAMeasurement = (request: express.Request, response: express.Response) =>  {
      const measurement: Measurement = request.body
      this.measurements.push(measurement)
      response.send(measurement)
  }
}
export default MeasurementController
