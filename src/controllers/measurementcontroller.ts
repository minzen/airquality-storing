import * as express from 'express'
import { MongoHelper } from '../utils/mongohelper'
import Measurement from './Measurement'
const dotenv = require('dotenv')
dotenv.config()
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

  getAllMeasurements = (
    request: express.Request,
    response: express.Response,
  ) => {
    console.log('Carrying out a query...')

    let db = MongoHelper.client.db(process.env.MONGODB_DB)
    db.collection(process.env.MONGODB_COLLECTION)
      .find({})
      .toArray((err: Error, result) => {
        if (err) {
          throw err
        }
        console.log('Results for the query obtained:', result)
        response.send(result)
      })
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
    console.log('Creating a measurement in the DB')
    let db = MongoHelper.client.db(process.env.MONGODB_DB)
    db.collection(process.env.MONGODB_COLLECTION).insertOne(
      measurement,
      (err: Error, response: express.Response) => {
        if (err) {
          throw err
        }
      },
    )
    console.log('1 measurement inserted')
    response.send(measurement)
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
