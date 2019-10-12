import * as express from 'express'
import Measurement from './measurement'
const dotenv = require('dotenv')
dotenv.config()
const assert = require('assert')

class MeasurementController {
  public path = '/measurements'
  public router = express.Router()
  private MongoClient = require('mongodb').MongoClient

  // private measurements: Measurement[] = [
  //   {
  //     date: new Date('2019-10-11T13:43:00'),
  //     temperature: 21.3,
  //     humidity: 55.4,
  //   },
  // ]

  constructor() {
    this.initializeRoutes()
  }

  public initializeRoutes() {
    this.router.get(this.path, this.getAllMeasurements)
    this.router.post(this.path, this.createAMeasurement)
  }

  private getDbConnectUrl() {
    const mongoDbHost = process.env.MONGODB_HOST
    const mongoDbUser = process.env.MONGODB_USER
    const mongoDbPwd = encodeURIComponent(process.env.MONGODB_PWD)
    const mongodbDbName = process.env.MONGODB_DB
    const mongodbDbPort = process.env.MONGODB_PORT

    const url =
      'mongodb://' +
      mongoDbUser +
      ':' +
      mongoDbPwd +
      '@' +
      mongoDbHost +
      ':' +
      mongodbDbPort +
      '/' +
      mongodbDbName +
      '?authMechanism=DEFAULT&AuthSource=airqualitydb'
    console.log(url)
    return url
  }

  getAllMeasurements = (
    request: express.Request,
    response: express.Response,
  ) => {
    const connectUrl = this.getDbConnectUrl()
    console.log('connectUrl', connectUrl)
    this.MongoClient.connect(
      connectUrl,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err: Error, db) => {
        assert.equal(null, err)
        console.log('Connected to the Server')

        console.log('Carrying out a query...')
        let dbo = db.db('airqualitydb')
        dbo
          .collection('measurement')
          .find({})
          .toArray((err: Error, result) => {
            if (err) {
              throw err
            }
            console.log('result:', result)
            response.send(result)
          })
        db.close()
        console.log('DB connection closed')
      },
    )
  }

  createAMeasurement = (
    // TODO: Sanitize the user input
    request: express.Request,
    response: express.Response,
  ) => {
    const measurement: Measurement = request.body
    console.log('Storing measurement', measurement, 'to the database')
    const connectUrl = this.getDbConnectUrl()
    console.log('connectUrl', connectUrl)
    this.MongoClient.connect(
      connectUrl,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err: Error, db) => {
        assert.equal(null, err)
        console.log('Connected to the Server')

        console.log('Creating a measurement in the DB')
        let dbo = db.db('airqualitydb')
        dbo
          .collection('measurement')
          .insertOne(measurement, (err: Error, res: express.Response) => {
            if (err) {
              throw err
            }
            console.log('1 measurement inserted')
            db.close()
            response.send(measurement)
          })
      },
    )
  }
}
export default MeasurementController
