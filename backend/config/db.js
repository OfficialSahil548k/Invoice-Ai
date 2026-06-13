import mongoose from 'mongoose';

export const connectDB = async ()=>{
    await mongoose.connect('mongodb+srv://sahil548k_db_user:AI_Invoice123@cluster0.kqmth2v.mongodb.net/InvoiceAI')
    .then(()=>{console.log('DB connected successfully')});
}