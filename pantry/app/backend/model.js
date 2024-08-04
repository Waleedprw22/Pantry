import * as dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors'; // Import CORS middleware
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { OpenAI } from 'openai'; // Import OpenAI SDK
import { firebaseConfig, app, storage } from '../firebase.js';

dotenv.config();

const server = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
server.use(cors()); 
server.use(bodyParser.json());
const upload = multer({ storage: multer.memoryStorage() }); 

server.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Resize and reduce image quality to help with LLM usage
    const imageBuffer = await sharp(req.file.buffer)
      .resize({ width: 20, height: 20, fit: 'inside' })
      .toBuffer();

    // Upload image to Firebase Storage
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const storageRef = ref(storage, fileName);
    const metadata = {
      contentType: req.file.mimetype,
    };

    await uploadBytes(storageRef, imageBuffer, metadata);

    // Generate a public URL for the uploaded file
    const publicUrl = await getDownloadURL(storageRef);

    // Call OpenAI API with image URL
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Return JSON of grocery items only like this: grocery_item : quantity',
            },
            {
              type: 'image_url',
              image_url: {
                url: publicUrl,
                details: 'low', // Helps with LLM response
              },
            },
          ],
        },
      ],
      max_tokens: 300,
    });

    console.log('OpenAI API response:', JSON.stringify(response.choices[0].message.content, null, 2));

    res.json({ data: response.choices[0].message.content}); // Return API response to frontend
  } catch (error) {
    console.error('Error processing image with OpenAI:', error); 
    res.status(500).json({ error: 'Error processing image' }); // Helps with debugging
  }
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`); 
});
