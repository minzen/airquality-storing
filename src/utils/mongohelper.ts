const dotenv = require('dotenv')
dotenv.config()
const mongoDbHost = process.env.MONGODB_HOST
const mongoDbUser = process.env.MONGODB_USER
const mongoDbPwd = encodeURIComponent(process.env.MONGODB_PWD)
const mongodbDbName = process.env.MONGODB_DB
const mongodbDbPort = process.env.MONGODB_PORT
//const mongoDbCollection = process.env.MONGODB_COLLECTION
import * as mongo from 'mongodb'

export class MongoHelper {
  public static client: mongo.MongoClient

  constructor() {}

  public static getDbConnectUrl(): string {
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

  public static connect(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const url = this.getDbConnectUrl()
      mongo.MongoClient.connect(
        url,
        { useNewUrlParser: true, useUnifiedTopology: true },
        (err, client: mongo.MongoClient) => {
          if (err) {
            reject(err)
          } else {
            MongoHelper.client = client
            resolve(client)
          }
        },
      )
    })
  }

  public disconnect(): void {
    MongoHelper.client.close()
  }
}
