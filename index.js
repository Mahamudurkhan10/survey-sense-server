const express = require('express');
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
require('dotenv').config()
const app = express();
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

    app.get('/surveys', async (req, res) => {
    
      const result = await surveyCollection.find().toArray()
      res.send(result)
    })
    app.post('/surveys', async(req,res)=>{
      const survey = req.body;
      const newSurvey = {
        title: survey.title,     
        description:survey.description,
        category: survey.category,
        options: survey.options,
        deadline_date: survey.deadline_date,
        vote: survey.vote,
        status:'publish',
        timestamp:new Date   
      }
     const result = await surveyCollection.insertOne(newSurvey);
     res.send(result)
    })
    app.get('/mostVotedSurvey', async (req, res) => {
    
      const result = await surveyCollection.find().sort({vote:-1}). toArray();
      res.send(result)
    })
    app.get('/surveyDetail/:id', async(req,res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await surveyCollection.findOne(query) 
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