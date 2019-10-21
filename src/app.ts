import * as express from 'express'
import * as bodyParser from 'body-parser'
const helmet = require('helmet')

class App {
  public app: express.Application
  public port: number

  constructor(controllers, port: number) {
    this.app = express()
    this.port = port

    this.initializeMiddlewares()
    this.initializeControllers(controllers)
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

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`App listening on the port ${this.port}`)
    })
  }
}
export default App
