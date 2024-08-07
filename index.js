require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns').promises;
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Basic Configuration
const port = process.env.PORT || 3000;

//connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

//Middleware to parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//API Post for URL Shortener Microservice Project
//Define URL schema and model
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true}
})
const UrlModel = mongoose.model('UrlModel', urlSchema);

app.post('/api/shorturl', async function (req, res) { 
  //validate the input url format
  const original_url = req.body.url;
  
  const urlPattern = /^(http|https):\/\/[a-zA-Z0-9-\.\/?=]+$/;
  if(!urlPattern.test(original_url)) {
    return res.json({ error: 'invalid url' });
  }
  
  //validate the input url: extract the hostname
  let hostname;
  try {
    hostname = new URL(original_url).hostname; 
  } catch(e) {
    return res.status(400).json({ error: 'invalid url' });
  }
  
  
  //validate the input url: perform DNS lookup
  try {
    await dns.lookup(hostname); 
    //check if URL already exists
    let data = await UrlModel.findOne({original_url: original_url});
  
    if (data) {
      return res.json({ original_url: data.original_url, short_url: data.short_url });
    } else {
      let count = await UrlModel.countDocuments();
        //create new url entry
      const newUrlEntry = new UrlModel({
        original_url: original_url,
        short_url: count + 1
      });
      
      let savedData = await newUrlEntry.save();
      return res.json({ original_url: savedData.original_url, short_url: savedData.short_url });
    }
  } catch (err) {
      if (err.code === 'ENOTFOUND') {
        return res.status(400).json({ error: 'invalid url' });
    }
      return res.status(500).json({ error: 'server error' });
  }
});

//redirect to original URL
app.get('/api/shorturl/:short_url?', async function (req, res) {
  const short_url = parseInt(req.params.short_url);
  try {
    let data = await UrlModel.findOne({ short_url: short_url });
    if (data) {
      return res.redirect(data.original_url);
    } else {
      return res.status(400).json({ error: 'No URL found for the given short_url' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }
});


// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
