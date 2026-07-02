# Internship Portal (Mini Project)

A full-stack web application designed to bridge the gap between students, faculty members, and department administrators for managing and tracking internships. It includes an intelligent notification matching engine that alerts students when internships matching their specific skill sets are posted.

## 🚀 Features

- **Role-Based Access Control (RBAC):**
  - **Student:** View and apply for internships, update skill sets, check application statuses.
  - **Faculty:** Mentor students, track mentee progress and applications.
  - **Department Admin (`dept_admin`):** Post and manage internships for specific departments.
  - **Main Admin (`main_admin`):** Overall system management and broad internship postings.
- **Intelligent Notification Engine:** Automatically matches posted internships with student skills and sends notifications.
- **Real-time Updates:** Powered by Socket.IO for live notification delivery.
- **Authentication & Security:** OTP-based password reset using Ethereal/Nodemailer and secure endpoints.
- **Dashboard Interfaces:** Dedicated vanilla JS frontends for Students, Faculty, and Admins (`public/` and `admin-portal/`).

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Real-Time Communication:** Socket.IO
- **Email/OTP Services:** Nodemailer
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Dev Tools:** Nodemon

## 📁 Project Structure

```
├── admin-portal/        # Admin interface static files
├── config/              # Configuration files (e.g., db.js for MongoDB setup)
├── models/              # Mongoose database schemas (User, Student, Internship, etc.)
├── public/              # Student & Faculty frontend static files (HTML/CSS/JS)
├── usecase_files/       # Assets and UI styles
├── server.js            # Main Express application entry point
├── package.json         # Project metadata and dependencies
└── .gitignore           # Ignored files and folders
```

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/download/) (v14 or above)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally or a MongoDB Atlas URI)
- [Git](https://git-scm.com/)

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Alviya-2004/Internship-Portal.git
   cd Internship-Portal
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of the project and add the necessary environment variables. For example:
   ```env
   MONGO_URI=mongodb://localhost:27017/internship_portal
   JWT_SECRET=your_secret_key
   ```
   *(Note: Adjust the variables based on the `config/db.js` and auth requirements in your codebase).*

## 🚀 Running the Application

To start the development server with live reload (via Nodemon):
```bash
npm run dev
```

To start the server normally:
```bash
node server.js
```

The server will typically run on `http://localhost:3000` or whatever port is defined in your `server.js` or environment variables. Open the URL in your browser to access the landing page.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/Alviya-2004/Internship-Portal/issues).

---
*Built with ❤️ for bridging students to opportunities.*
