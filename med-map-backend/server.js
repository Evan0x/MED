require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Profile = require('./models/Profile');

const app = express();
app.use(express.json());
app.use(cors()); // Allows your Vite frontend to talk to this server

// Add this line right above mongoose.connect
console.log("TESTING URI:", process.env.MONGO_URI);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ DB Connection Error:", err));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch(err => console.log("❌ DB Connection Error:", err));

// --- ROUTE 1: Save or Update Profile ---
app.post('/api/profile', async (req, res) => {
  const { clerkUserId, ...profileData } = req.body;

  if (!clerkUserId) {
    return res.status(400).json({ error: "Missing Clerk User ID" });
  }

  try {
    const profile = await Profile.findOneAndUpdate(
      { clerkUserId: clerkUserId },
      { $set: profileData },
      { new: true, upsert: true }
    );
    res.json({ message: "Profile saved successfully", profile });
  } catch (error) {
    res.status(500).json({ error: "Failed to save profile" });
  }
});

// --- ROUTE 2: Get Profile ---
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const profile = await Profile.findOne({ clerkUserId: req.params.userId });
    if (!profile) return res.json({}); 
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});