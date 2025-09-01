
import dotenv from 'dotenv';
dotenv.config();
console.log('LOG_TOKEN from env:', process.env.LOG_TOKEN); 

import express from 'express';
import urlRoutes from './routes/urlRoutes.js';

const app = express();
app.use(express.json());

app.use('/', urlRoutes);         

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  
});
