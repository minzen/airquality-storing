const dotenv = require('dotenv')
const { ApolloServer, gql, UserInputError } = require('apollo-server')
dotenv.config()
const serverPort: number = parseInt(`${process.env.PORT}`, 10) || 4000
const mongoose = require('mongoose')
const Measurement = require('./models/measurement')

// Store the date as String to make it easier 
const typeDefs = gql`
  type Measurement {
    id: ID!
    measurementDate: String!
    temperature: Float
    humidity: Float
  }
  type Query {
    measurements: [Measurement]
    numberOfMeasurements: Int!
  }
  type Mutation {
    addMeasurement(
      measurementDate: String!
      temperature: Float
      humidity: Float
    ): Measurement
  }
`

const resolvers = {
  Query: {
    numberOfMeasurements: () => Measurement.collection.countDocuments(),
    measurements: async () => {
      return await Measurement.find({})
    },
  },
  Mutation: {
    addMeasurement: async (root, args) => {
      console.log('addMeasurement', args)
      const measurement = new Measurement({ ...args })
      try {
        await measurement.save()
      } catch (e) {
        console.log('error when saving a measurement', e)
        throw new UserInputError(e.message, { invalidArgs: args })
      }
      console.log(`Measurement ${measurement} saved.`)
      return measurement
    },
  },
}

const startDb = async () => {
  console.log('Creating a DB connection to MongoDB Atlas...')
  const MONGODB_URI = process.env.MONGODB_URI
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log('connected to MongoDB')
  } catch (e) {
    console.log('error when connecting to MongoDB', e.message)
  }
}
startDb()

const context = async ({ req }) => {
   // Note! This example uses the `req` object to access headers,
   // but the arguments received by `context` vary by integration.
   // This means they will vary for Express, Koa, Lambda, etc.!
   //
   // To find out the correct arguments for a specific integration,
   // see the `context` option in the API reference for `apollo-server`:
   // https://www.apollographql.com/docs/apollo-server/api/apollo-server/

   // Get the user token from the headers.
  //  const token = req.headers.authorization || ''

   // try to retrieve a user with the token
   const user = null // getUser(token)

   // add the user to the context
   return { user }
 }

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  introspection: true, // enables introspection of the schema
  playground: true,
})


server.listen({ port: serverPort }, () =>
  console.log(`Apollo Server running at http://localhost:${serverPort}/graphql.`)
)