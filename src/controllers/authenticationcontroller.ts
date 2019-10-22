import * as express from 'express'
const dotenv = require('dotenv')
dotenv.config()
const jwt = require('jsonwebtoken')
//const { check, validationResult } = require('express-validator')

class AuthenticationController {
  public path: string = '/authenticate'
  public router = express.Router()

  constructor() {
    this.initializeRoutes()
  }

  public initializeRoutes() {
    this.router.post(this.path, [], this.authenticate)
  }

  authenticate = (request: express.Request, response: express.Response) => {
    if (
      request.body.username === process.env.API_USER &&
      request.body.password === process.env.API_PWD
    ) {
      const userForToken = {
        username: process.env.API_USER,
        id: process.env.API_USER_ID,
      }

      let token = jwt.sign(userForToken, process.env.SECRET, {
        expiresIn: 1440,
      })

      response.json({
        message: 'authentication done',
        token: token,
      })
    } else {
      response.json({ message: 'user not found' })
    }
  }
}
export default AuthenticationController
