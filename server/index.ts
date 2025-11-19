import dotenv from 'dotenv';
import pkg from 'express';
const express = pkg;
import cors from 'cors';
import authRoutes from './routes/auth.ts';
import documentRoutes from './routes/documents.ts';


dotenv.config();


const app = express();

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(express.json());             

app.use(cors(corsOptions));
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);



const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;