const keys = require("./keys");

///////////////////////
// EXPRESS APP SETUP //
///////////////////////

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors()); // cross origin resource sharing. All us to make request from one domain to another domain or port
app.use(bodyParser.json()); // parse incoming request to json value to easily work with it.

///////////////////////////
// POSTGRES CLIENT SETUP //
///////////////////////////
// sql type database like my sql

const { Pool } = require('pg');
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
});
pgClient.on('error', () => console.log('Lost PG connection'));

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

////////////////////////
// REDIS CLIENT SETUP //
////////////////////////
const redis = require('redis');
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate(); // making duplicate connection because when a connection is subscribed with redis we cannot do other things then


////////////////////////////
// EXPRESS ROUTE HANDLERS //
////////////////////////////

app.get('/', (req, res) => {
    res.send('Hi');
  });
  
  app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * from values');
  
    res.send(values.rows);
  });
  
  app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
      res.send(values);
    });
  });
  
  app.post('/values', async (req, res) => {
    const index = req.body.index;
  
    if (parseInt(index) > 40) {
      return res.status(422).send('Index too high');
    }
  
    redisClient.hset('values', index, 'Nothing yet!');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
  
    res.send({ working: true });
  });
  
  app.listen(5000, err => {
    console.log('Listening');
  });
  