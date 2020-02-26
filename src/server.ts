const dotenv = require('dotenv')
dotenv.config()
const {
  ApolloServer,
  gql,
  UserInputError,
  AuthenticationError,
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
const createPwdHash = async (password: string) => {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// Store the measurementDate as String as GraphQL does not support date type out of the box
const typeDefs = gql`
  type Measurement {
    id: ID!
    measurementDate: String!
    temperature: Float
    humidity: Float
  }
  type User {
    id: ID!
    username: String!
    passwordHash: String!
  }
  type Token {
    value: String!
  }
  type Query {
    measurements: [Measurement]
    numberOfMeasurements: Int!
    users: [User]
  }
  type Mutation {
    addMeasurement(
      measurementDate: String!
      temperature: Float
      humidity: Float
    ): Measurement
    addUser(username: String!, password: String!): User
    login(username: String!, password: String!): Token
  }
`

const resolvers = {
  Query: {
    numberOfMeasurements: () => Measurement.collection.countDocuments(),
    measurements: async (root:any, args:any, context:any) => {
      return await Measurement.find({})
    },
  },
  Mutation: {
    addMeasurement: async (root:any, args:any, context:any) => {
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
      console.log(`Measurement ${measurement} saved.`)
      return measurement
    },
    addUser: async (root:any, args:any) => {
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
    login: async (root:any, args:any) => {
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
}

const getTokenFromReq = (req:any) => {
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

const context = async ({ req }: any) => {
  let currentUser = null
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

  return { currentUser }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  introspection: true, // enables introspection of the schema
  playground: true,
})

server.listen({ port: serverPort }, () =>
  console.log(
    `Apollo Server running at http://localhost:${serverPort}/graphql.`,
  ),
)
