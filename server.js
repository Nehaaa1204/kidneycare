
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'dsy2znu4i',
  api_key: '348998115142768',
  api_secret: 'NL-_E0ZofCpYrKsz_9l5D1jrE38'
});

// Setup multer storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'medical_images', // folder in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg']
  }
});

const upload = multer({ storage });


const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt'); // for password hashing

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Atlas URI
const uri = 'mongodb+srv://maratheneha1204_db_user:j2QU557aWbLRUUWi@cluster0.g93dpr4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
let db;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db('medicaldb');
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}
connectToDatabase();

// Middleware: Ensure DB connected
function ensureDbConnected(req, res, next) {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected yet. Please wait and retry.' });
  }
  next();
}

//////////////////////////////////////////////////////////
// 🔹 USER AUTH (Signup + Login)
//////////////////////////////////////////////////////////

// Signup
app.post('/signup', ensureDbConnected, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const usersCollection = db.collection('users');

    // Check if user exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user
    const result = await usersCollection.insertOne({ username, password: hashedPassword, role });
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error('POST /signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/login', ensureDbConnected, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const usersCollection = db.collection('users');

    // Find user
    const user = await usersCollection.findOne({ username, role });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or role' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    res.json({ success: true, message: 'Login successful', user: { username, role } });
  } catch (error) {
    console.error('POST /login error:', error);
    res.status(500).json({ error: error.message });
  }
});

//////////////////////////////////////////////////////////
// 🔹 PATIENTS
//////////////////////////////////////////////////////////

// Add a patient
app.post('/patients', ensureDbConnected, async (req, res) => {
  try {
    const patient = req.body;
    const result = await db.collection('patients').insertOne(patient);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error('POST /patients error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all patients


//////////////////////////////////////////////////////////
// 🔹 NOTES
//////////////////////////////////////////////////////////

// Add a note (doctor adds for a specific patient)
app.post('/notes', ensureDbConnected, async (req, res) => {
  try {
    const { patientId, doctorUsername, note } = req.body;

    if (!patientId || !doctorUsername || !note) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const noteRecord = {
      patientId,
      doctorUsername,
      note,
      createdAt: new Date()
    };

    const result = await db.collection('patientNotes').insertOne(noteRecord);
    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error('POST /notes error:', error);
    res.status(500).json({ error: error.message });
  }
});


app.post('/upload/:patientIdImaging', upload.single('image'),async(req,res) => { 
  try {
    const patientIdImaging = req.params.patientIdImaging;

    if (!patientIdImaging){
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    const scanRecord = {
      patientIdImaging,
      imageUrl: req.file.path,   // Cloudinary URL
      uploadedAt: new Date()
    };

    await db.collection("scans").insertOne(scanRecord);
    res.json({
      success: true,
      message:"Scan uploaded successfully",
      scan: scanRecord// Cloudinary URL
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get notes for a patient
app.get('/notes/:patientId', ensureDbConnected, async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const notes = await db.collection('patientNotes').find({ patientId }).toArray();
    res.json(notes);
  } catch (error) {
    console.error('GET /notes/:patientId error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /patients/signedup
app.get('/patients/signedup', async (req, res) => {
  try {
    const patients = await db.collection('users')
      .find({ role: "patient" })  // only patients
      .toArray();
    res.json(patients);
  } catch (error) {
    console.error('GET /patients/signedup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all scans for a patient
app.get('/scans/:patientIdImaging', ensureDbConnected, async (req, res) => {
  try {
    const patientIdImaging = req.params.patientIdImaging;
    

    if(!patientIdImaging){
      return res.status(400).json({ error: 'Patient ID is required' });
    }
    const scans = await db.collection('scans')
      .find({patientIdImaging })
      .sort({ uploadedAt: -1 }) // newest first
      .toArray();
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




//////////////////////////////////////////////////////////
// 🔹 START SERVER
//////////////////////////////////////////////////////////

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
  }
  console.log('Server shut down gracefully');
  process.exit(0);
});
