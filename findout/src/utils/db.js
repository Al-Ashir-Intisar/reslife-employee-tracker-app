import mongoose from 'mongoose';

const connect = async () => {
    
    try {
        await mongoose.connect(process.env.MONGO);

    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw new Error('Failed to connect to MongoDB');
    }

};

export default connect;