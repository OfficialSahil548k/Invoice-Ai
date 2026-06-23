# Invoice-AI 📄

An AI-integrated invoice generator platform for businesses built on the MERN stack. Streamline your invoicing process with intelligent automation powered by Google Gemini AI.

## 🌟 Features

- **AI-Powered Invoice Generation**: Leverage Google Gemini AI to automatically generate and optimize invoices
- **User Authentication**: Secure authentication using Clerk
- **Professional Invoice Management**: Create, view, and manage invoices with ease
- **Responsive Design**: Modern, mobile-friendly UI built with React and Tailwind CSS
- **Database Integration**: MongoDB for reliable data storage
- **REST API**: Robust backend API with Express.js
- **File Upload Support**: Handle invoice documents with Multer

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Clerk** - Authentication and user management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Google Gemini AI** - AI invoice generation
- **Clerk Express** - Authentication middleware
- **Multer** - File upload handling
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or cloud instance)
- Git

## 🚀 Getting Started

### Clone the Repository

```bash
git clone https://github.com/OfficialSahil548k/Invoice-Ai.git
cd Invoice-Ai
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory with the following variables:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLERK_SECRET_KEY=your_clerk_secret_key
GOOGLE_GENAI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_jwt_secret_key
```

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:5000` with hot-reloading via Nodemon.

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## 📦 Available Scripts

### Backend
- `npm start` - Start the development server with Nodemon

### Frontend
- `npm run dev` - Start the Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
CLERK_SECRET_KEY=sk_test_xxxxx
GOOGLE_GENAI_API_KEY=AIzaSyxxxxxx
JWT_SECRET=your_secret_key_here
```

### Frontend (.env)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_API_URL=http://localhost:5000
```

## 🔑 Key Configuration

- **Clerk**: Set up authentication at [clerk.com](https://clerk.com)
- **Google Gemini API**: Get your API key from [Google AI Studio](https://aistudio.google.com)
- **MongoDB**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

## 📁 Project Structure

```
Invoice-Ai/
├── frontend/              # React + Vite frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/               # Express.js backend
│   ├── models/           # MongoDB schemas
│   ├── controllers/      # Route controllers
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   ├── server.js         # Entry point
│   └── package.json
└── README.md
```

## 🤖 AI Integration

This platform integrates Google Gemini AI to:
- Generate invoices from data inputs
- Optimize invoice formatting
- Extract information from uploaded documents
- Provide intelligent suggestions

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Clerk authentication system
- CORS protection
- Input validation with validator.js

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Sahil** - [GitHub Profile](https://github.com/OfficialSahil548k)

## 📧 Support

For support, please open an issue in the repository or contact the maintainer.

## 🔗 Resources

- [MERN Stack Documentation](https://www.mongodb.com/mern-stack)
- [Clerk Documentation](https://clerk.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [Express.js Guide](https://expressjs.com/)
- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Made with ❤️ by Sahil**