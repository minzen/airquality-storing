import * as express from 'express'
import Measurement from './measurement'
const dotenv = require('dotenv')
dotenv.config()
const mongoDbHost = process.env.MONGODB_HOST
const mongoDbUser = process.env.MONGODB_USER
const mongoDbPwd = encodeURIComponent(process.env.MONGODB_PWD)
const mongodbDbName = process.env.MONGODB_DB
const mongodbDbPort = process.env.MONGODB_PORT
const mongoDbCollection = process.env.MONGODB_COLLECTION
const assert = require('assert')
const { check, validationResult } = require('express-validator')
const jwt = require('jsonwebtoken')

function isValidDate(val: string) {
  const regExMatch = val.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)
  if (!regExMatch) {
    return false
  }

  const date = new Date(val)
  if (!date.getTime()) {
    return false
  }

  return true
}

class MeasurementController {
  public path: string = '/measurements'
  public router = express.Router()
  private MongoClient = require('mongodb').MongoClient

  constructor() {
    this.initializeRoutes()
  }

  public initializeRoutes() {
    this.router.get(this.path, this.getAllMeasurements)
    this.router.post(
      this.path,
      [
        check('date')
          .custom(isValidDate)
          .withMessage('the date must be valid'),
        check('temperature').isDecimal(),
        check('humidity').isDecimal(),
      ],
      this.createAMeasurement,
    )
  }

  private getDbConnectUrl() {
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
    console.log('Connection URL', url.substring(0, 10), '...')
    return url
  }

  getAllMeasurements = (
    request: express.Request,
    response: express.Response,
  ) => {
    const connectUrl = this.getDbConnectUrl()
    // console.log('connectUrl', connectUrl)
    this.MongoClient.connect(
      connectUrl,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err: Error, db) => {
        assert.equal(null, err)
        console.log('Connected to the Server', mongoDbHost)

        console.log('Carrying out a query...')
        let dbo = db.db(mongodbDbName)
        dbo
          .collection(mongoDbCollection)
          .find({})
          .toArray((err: Error, result) => {
            if (err) {
              throw err
            }
            console.log('Results for the query obtained:', result)
            response.send(result)
          })
        console.log('DB connection closed')
        db.close()
      },
    )
  }

  createAMeasurement = (
    request: express.Request,
    response: express.Response,
  ) => {
    // Check for the JWT; if not available, do not allow access
    const token = this.getTokenFromRequest(request)
    console.log('token from request', token)
    try {
      console.log(process.env.SECRET)
      const decodedToken = jwt.verify(token, process.env.SECRET)
      console.log('decodedToken', decodedToken)
      if (!token || !decodedToken.id) {
        console.log('access token', token)
        response.status(401).json({ error: 'token missing or invalid' })
        return
      }
    } catch (err) {
      console.log(err)
      response.status(401).json({ error: 'token missing or invalid' })
      return
    }

    const result = validationResult(request)
    if (!result.isEmpty()) {
      console.log('validation result', result)
      response.status(422)
      response.send({ errors: result.array() })
      return
    }
    const measurement: Measurement = {
      date: request.body.date,
      temperature: request.body.temperature,
      humidity: request.body.humidity,
    }
    console.log('Storing measurement', measurement, 'to the database')
    const connectUrl = this.getDbConnectUrl()
    // console.log('connectUrl', connectUrl)
    this.MongoClient.connect(
      connectUrl,
      { useNewUrlParser: true, useUnifiedTopology: true },
      (err: Error, db) => {
        assert.equal(null, err)
        console.log('Connected to the Server ', mongoDbHost)
        console.log('Creating a measurement in the DB')
        let dbo = db.db(mongodbDbName)
        dbo
          .collection(mongoDbCollection)
          .insertOne(measurement, (err: Error, response: express.Response) => {
            if (err) {
              throw err
            }
          })
        console.log('1 measurement inserted')
        db.close()
        response.send(measurement)
      },
    )
  }

  private getTokenFromRequest(request) {
    const authorization = request.get('authorization')
    if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
      return authorization.substring(7)
    }
    return null
  }
}
export default MeasurementController
