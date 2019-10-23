import * as express from 'express'
import * as bodyParser from 'body-parser'
import { MongoHelper } from './utils/mongohelper'
const helmet = require('helmet')

class App {
  public app: express.Application
  public port: number

  constructor(controllers, port: number) {
    this.app = express()
    this.port = port

    this.initializeMiddlewares()
    this.initializeControllers(controllers)

    this.connectToDb()
  }

  public async connectToDb() {
    try {
      await MongoHelper.connect()
      console.info(`Connected to Mongo!`)
    } catch (err) {
      console.error(`Unable to connect to Mongo!`, err)
    }
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`App listening on the port ${this.port}`)
    })
  }

  private initializeMiddlewares() {
    this.app.use(bodyParser.json())
    this.app.use(helmet())
  }

  private initializeControllers(controllers) {
    controllers.forEach(controller => {
      this.app.use('/', controller.router)
    })
  }
}
export default App
