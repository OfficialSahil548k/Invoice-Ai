import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express';
import { connectDB } from './config/db.js';

const app = express();
const port = 4000;


// Middleware
app.use(cors());
app.use(clerkMiddleware());
app.use(express.json({limit: "20mb"}));
app.use(express.urlencoded({limit: "20mb", extended: true}));

// Db
connectDB();

// Routes

app.get('/', (req,res)=>{
    res.send('Server Started');
});

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
});
