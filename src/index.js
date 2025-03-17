import dotenv from 'dotenv';
import connectDB from "./db/index.db.js"
import app from './app.js';

dotenv.config({
    path: './env'
})
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000 ,()=>{
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    })
})
.catch((err) => {
    console.log("Database connection failed !!",err);
    })