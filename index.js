const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const app = express();
const stripe = require('stripe')(process.env.STRIPE_ENV_KEY)
const port = process.env.PROT || 5000;

// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@atlascluster.6gwdl3v.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //     await client.connect();
    const surveyCollection = client.db('SurveySense').collection('surveys')
    const usersCollection = client.db('SurveySense').collection('users')
    const reportCollection = client.db('SurveySense').collection('report')
    const responseCollection = client.db('SurveySense').collection('response')
    const paymentCollection = client.db('SurveySense').collection('payments')
    const commentsCollection = client.db('SurveySense').collection('comments')
    const feedBackCollection = client.db('SurveySense').collection('feedback')
    // token
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })
    const verifyToken = (req, res, next) => {

      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next()
      })


    }
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin"
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }
    const verifySurveyor = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const surveyor = user?.role === "surveyor"
      if (!surveyor) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      next()
    }
    app.get('/surveys', async (req, res) => {

      const result = await surveyCollection.find().toArray()
      res.send(result)
    })
    app.post('/surveys', async (req, res) => {
      const survey = req.body;
      const newSurvey = {
        title: survey.title,
        description: survey.description,
        category: survey.category,
        options: survey.options,
        deadline_date: survey.deadline_date,
        yesVote: survey.yesVote,
        noVote: survey.noVote,
        vote: survey.vote,
        status: 'publish',
        timestamp: new Date
      }
      const result = await surveyCollection.insertOne(newSurvey);
      res.send(result)
    })
    app.get('/mostVotedSurvey', async (req, res) => {

      const result = await surveyCollection.find().sort({ vote: -1}).toArray();
      res.send(result)
    })
   
    
    app.get('/surveyDetail/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await surveyCollection.findOne(query)
      res.send(result)
    })
    app.get('/survey/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await surveyCollection.findOne(query);

      res.send(result)
    })
    app.patch('/update/:id', verifyToken, verifySurveyor, async (req, res) => {
      const survey = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          title: survey.title,
          description: survey.description,
          category: survey.category,
          options: survey.options,
          deadline_date: survey.deadline_date,



        }
      }
      const result = await surveyCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.get('/totalVotesByCategory', async (req, res) => {

      const result = await surveyCollection.aggregate([
        {
          $group: {
            _id: "$category",
            category: { $first: "$category" },
            totalYesVote: { $sum: "$yesVote" },
            totalNoVote: { $sum: "$noVote" },
            totalVote: { $sum: '$vote' }
          }

        },
        {
          $project: {
            _id: 0,
            category: 1,
            totalYesVote: 1,
            totalNoVote: 1,
            totalVote: 1
          }
        }
      ]).toArray();

      res.send(result);
    })
    // payment
    app.get('/payments', verifyToken, verifyAdmin, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result)
    })
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment)
      res.send(paymentResult)

    })
  
    app.patch('/yesVoteUpdate/:id', async (req, res) => {
      const survey = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          yesVote: survey.yes,
          vote: survey.vote,
          voterEmail: survey.voterEmail

        }
      }
      const result = await surveyCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.patch('/noVoteUpdate/:id', async (req, res) => {
      const survey = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          noVote: survey.no,
          vote: survey.vote,
          voterEmail: survey.voterEmail
        }
      }
      const result = await surveyCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    // user
    app.get('/users', async (req, res) => {

      const result = await usersCollection.find().toArray();
      res.send(result)
    })
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query)
      res.send(user)

    })

    app.patch('/users/admin/:id', async (req, res) => {
      const item = req.body;

      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: item.role
        }

      }

      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.patch('/userRoleUpdate/:email', async (req, res) => {
      const item = req.body;

      const email = req.params.email;

      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: item.role
        }

      }

      const result = await usersCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })
    // report 
    app.get('/report', async (req, res) => {

      const result = await reportCollection.find().toArray();
      res.send(result)
    })
    app.post('/report', async (req, res) => {
      const report = req.body;
      const result = await reportCollection.insertOne(report)
      res.send(result)
    })
    app.get('/report/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await reportCollection.find(query).toArray();
      res.send(user)

    })
    // vote /Response
    app.get('/response', verifyToken, async (req, res) => {

      const result = await responseCollection.find().toArray();
      res.send(result)
    })
    app.get('/response/:id', async (req, res) => {
      const id = req.params.id;
      const query = { resId: id };
      const result = await responseCollection.find(query).toArray();
      res.send(result)

    })
    app.get('/responseMail/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await responseCollection.find(query).toArray();
      res.send(result)

    })
    app.get('/responseOne/:id', async (req, res) => {
      const id = req.params.id;
      const query = { resId: id };
      const result = await responseCollection.findOne(query);
      res.send(result)

    })
    app.post('/response', async (req, res) => {
      const response = req.body;
      const result = await responseCollection.insertOne(response);
      res.send(result)
    })
    // comment
    app.get('/comments', verifyToken, async (req, res) => {
      const result = await commentsCollection.find().toArray();
      res.send(result)
    })
    app.get('/comments/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await commentsCollection.find(query).toArray();
      res.send(result)

    })
    app.post('/comments', async (req, res) => {
      const comment = req.body;
      const result = await commentsCollection.insertOne(comment)
      res.send(result)
    })
    // feedBack
    app.get('/feedback', verifyToken, verifySurveyor, async (req, res) => {
      const result = await feedBackCollection.find().toArray();
      res.send(result)

    })
    app.post('/feedback', verifyToken, verifyAdmin, async (req, res) => {
      const feedBack = req.body;
      const result = await feedBackCollection.insertOne(feedBack)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //     await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('survey server is running')

})
app.listen(port, () => {
  console.log(`survey server is running on port ${port}`);
})