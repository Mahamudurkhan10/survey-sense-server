const express = require('express');
const cors = require ('cors')
const app = express();
const port = process.env.PROT || 5000;

// middleware
app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
     res.send('survey server is running')

})
app.listen(port , ()=>{
     console.log(`survey server is running on port ${port}`);
})