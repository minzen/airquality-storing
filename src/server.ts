const dotenv = require('dotenv')
dotenv.config()
const port: number = parseInt(`${process.env.PORT}`, 10) || 3000
import * as express from 'express'
const app = express()

app.get('/measurements', (req: express.Request, res: express.Response) => {
  res.send('Get measurements')
})

app.post('/measurement', (req: express.Request, res: express.Response) => {
  res.send('Post response')
})

app.listen(port)
console.log('start server at port', port)
