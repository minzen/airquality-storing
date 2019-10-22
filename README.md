# Airquality storage API

- This project is built on [https://github.com/jsynowiec/node-typescript-boilerplate](https://github.com/jsynowiec/node-typescript-boilerplate).
- The objective is to provide an API for storing air quality related data to a DB for storage and further analysis. The data can be e.g. gathered by a Raspberry PI based system and sent through the provided RESTful API in JSON format.
- At the moment the following endpoints are available

  - POST /authenticate
    - Authenticate the user by providing the username and password in the JSON format in the request body
    - Token based authentication is required for the user to be able to write measurement data to the database. At the moment the credentials are simply specified in the file .env (API_USER, API_PWD, and API_USER_ID)
  - GET /measurements
    - Returns all the airquality measurement data in the JSON format
  - POST /measurements

    - Submits a new measurement in a HTTP/POST request
    - The authentication token has to be provided in the request header (`Authentication: Bearer xxxxxxxxxxxxxxxxxxxxxxxxxx`) where xxxxxxxxxxxxxxxxxxxxxxxxxx is to be replaced by the actual token provided by the authentication end point.
    - sample payload data for a POST request:

      ```json
      {
        "date": "2019-10-22T00:24:00",
        "temperature": 16.6,
        "humidity": 65.2
      }
      ```
