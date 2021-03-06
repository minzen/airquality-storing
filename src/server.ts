const dotenv = require('dotenv')
dotenv.config()
const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError,
  PubSub,
} = require('apollo-server')
const stripJs = require('strip-js')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Measurement = require('./models/measurement')
const User = require('./models/user')
const Token = require('./models/token')
const serverPort: number = parseInt(`${process.env.PORT}`, 10) || 4000
const AUTHORIZATION = 'authorization'
const BEARER = 'bearer '
const NOT_AUTHENTICATED = 'not authenticated'
const PRODUCTION = 'production'
const NODE_ENV = process.env.NODE_ENV
const pubsub = new PubSub()

const createPwdHash = async (password: string) => {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

const typeDefs = gql`
  "The type Measurement is a single measurement entry containing an ID, date of the measurement as timestamp as well as temperature and humidity as float values"
  type Measurement {
    """
    id: identifier of the measurement
    """
    id: ID!
    """
    measurementDate: timestamp of the measurement stored as String as GraphQL does not support date type out of the box
    """
    measurementDate: String!
    """
    temperature: measured value for the temperature in degrees (°C)
    """
    temperature: Float
    """
    humidity: measured value for the humidity as percentage
    """
    humidity: Float
  }
  "The type User is a user of the GraphQL API (e.g. adding new messages requires an authentication)"
  type User {
    """
    id: identifier of the user
    """
    id: ID!
    """
    username: user's login identifier
    """
    username: String!
    """
    passwordHash: a hash value computed from the user's password
    """
    passwordHash: String!
  }
  "The type Token is a String value used in the request headers as authorization bearer for an authenticated user"
  type Token {
    """
    value: token as String value
    """
    value: String!
  }
  "The type Query contains the existing queries for obtaining stored measurements and users as well as number of measurements"
  type Query {
    """
    measurements: obtain stored measurements (20 newest entries)
    return value: an array of measurements or in case of no measurements, an empty array
    """
    measurements: [Measurement]
    """
    numberOfMeasurements: get the overall count of measurements stored to the system
    return value: an integer
    """
    numberOfMeasurements: Int!
    """
    users: obtain the stored users
    """
    users: [User]
  }
  "The type Mutation contains the existing mutations used to change the state of the system (e.g. adding measurements, users)"
  type Mutation {
    """
    addMeasurement: the method takes care of adding a new measurement to the data storage
    parameters: measurement date (timestamp): String, temperature: float, humidity: float
    return value: the stored Measurement or null, if the operation fails
    """
    addMeasurement(
      measurementDate: String!
      temperature: Float
      humidity: Float
    ): Measurement
    """
    addUser: the method takes care of adding a new user to the data storage (deactivated in the production mode, as not protected at the moment from access)
    parameters: username: String, password: String
    return value: the stored User or null, if the operation fails
    """
    addUser(username: String!, password: String!): User
    """
    login: the method takes care of logging the user in to the system
    parameters: username: String, password: String
    return value: Token: String value to be used as the authorization bearer or null if the login is unsuccessful
    """
    login(username: String!, password: String!): Token
  }
  type Subscription {
    measurementAdded: Measurement!
  }
`

const resolvers = {
  Query: {
    numberOfMeasurements: () => Measurement.collection.countDocuments(),
    measurements: async (root: any, args: any, context: any) => {
      return await Measurement.find({})
        .sort({ measurementDate: -1 })
        .limit(20)
    },
  },
  Mutation: {
    addMeasurement: async (root: any, args: any, context: any) => {
      const currentUser = context.currentUser
      if (!currentUser) {
        throw new AuthenticationError(NOT_AUTHENTICATED)
      }

      console.log('addMeasurement', args)
      const measurement = new Measurement({ ...args })
      try {
        await measurement.save()
      } catch (e) {
        console.log('error when saving a measurement', e)
        throw new UserInputError(e.message, { invalidArgs: args })
      }
      pubsub.publish('MEASUREMENT_ADDED', { measurementAdded: measurement })
      console.log(`Measurement ${measurement} saved.`)
      return measurement
    },
    addUser: async (root: any, args: any) => {
      if (NODE_ENV === PRODUCTION) {
        return null
      }
      console.log('username', args.username)
      const inputUsername = stripJs(args.username, 'string')
      console.log('username sanitized', inputUsername)
      const inputPassword = stripJs(args.password, 'string')
      try {
        const passwordHash = await createPwdHash(inputPassword)
        const user = new User({
          username: inputUsername,
          passwordHash: passwordHash,
        })
        await user.save()
        return user
      } catch (e) {
        console.log('error when adding user')
        return null
      }
    },
    login: async (root: any, args: any) => {
      console.log('username', args.username)
      const inputUsername = stripJs(args.username, 'string')
      console.log('username sanitized', inputUsername)
      const inputPassword = stripJs(args.password, 'string')
      try {
        const user = await User.findOne({ username: inputUsername })
        if (!user) {
          console.log('invalid username or password')
          throw new UserInputError('wrong credentials')
        }
        const passwordOk = await bcrypt.compare(
          inputPassword,
          user.passwordHash,
        )
        console.log('passwordOk', passwordOk)
        if (!passwordOk) {
          console.log('Invalid username or password')
          throw new UserInputError('wrong credentials')
        }
        const userForToken = {
          username: user.username,
          id: user._id,
        }
        console.log('userForToken', userForToken)
        const token = await jwt.sign(userForToken, process.env.JWT_SECRET)

        console.log('token', token)
        return new Token({ value: token })
      } catch (e) {
        console.log('error', e)
      }
    },
  },
  Subscription: {
    measurementAdded: {
      subscribe: () => pubsub.asyncIterator(['MEASUREMENT_ADDED']),
    },
  },
}

const getTokenFromReq = (req: any) => {
  const authorization = req.get(AUTHORIZATION)
  if (authorization && authorization.toLowerCase().startsWith(BEARER)) {
    return authorization.substring(7)
  }
  return null
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

const context = async ({ req, connection }: any) => {
  let currentUser = null

  if (connection) {
    // check connection for metadata
    return connection.context
  } else {
    // Get the token from the request
    const token = getTokenFromReq(req)
    if (token) {
      try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
        if (!token || !decodedToken.id) {
          console.log('missing or invalid token')
        } else {
          currentUser = await User.findById(decodedToken.id)
          // console.log('user', currentUser, ' set as currentUser')
        }
      } catch (e) {
        console.log('Error with token handling', e)
      }
    }
  }
  return { currentUser }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  introspection: true, // enables introspection of the schema
  playground: true,
})

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Apollo Server running at ${url}.`)
  console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})
