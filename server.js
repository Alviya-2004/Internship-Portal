const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');

let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return;
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
    console.log('Ethereal Nodemailer initialized for testing');
});

const connectDB = require('./config/db');

// models
const User = require('./models/User');
const StudentProfile = require('./models/StudentProfile');
const Domain = require('./models/Domain');
const Skill = require('./models/Skill');
const FacultyProfile = require('./models/FacultyProfile');
const StudentMentor = require('./models/StudentMentor');
const Application = require('./models/Application');
const Student = require('./models/Student');
const Internship = require('./models/Internship');
const AdminProfile = require('./models/AdminProfile');
const Company = require('./models/Company');
const Notification = require('./models/Notification');

const app = express();

// HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', socket => {
  console.log('Client connected to notifications');
});

// connect to MongoDB
connectDB();

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------ HELPER: faculty + mentees ------------------ */

async function getFacultyAndStudentProfileIdsFromToken(token) {
  if (!token) return { error: 'Not logged in' };

  const user = await User.findById(token);
  if (!user || !['faculty', 'dept_admin'].includes(user.role)) {
    return { error: 'Only faculty or department admins can access this resource' };
  }

  const facultyProfile = await FacultyProfile.findOne({ user: user._id });
  if (!facultyProfile) {
    return { error: 'Faculty profile not found' };
  }

  const mappings = await StudentMentor
    .find({ faculty: facultyProfile._id })
    .select('student');

  const studentProfileIds = mappings.map(m => m.student);
  return { user, facultyProfile, studentProfileIds };
}

/* ------------------ STUDENT & INTERNSHIP BASIC ------------------ */

// create student (simple demo)
app.post('/api/students', async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create internship (admin)
app.post('/api/internships', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const user = await User.findById(token);
    if (!user || !['main_admin', 'dept_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admins can post internships' });
    }

    let { title, admin_dept, company_id, location, mode, stipend, skill_set, start_date, end_date, deadline } = req.body;
    if (user.role === 'dept_admin') {
      admin_dept = user.department;
    }

    const internship = await Internship.create({
      title,
      admin_dept,
      company_id,
      location,
      mode,
      stipend,
      skill_set,
      start_date,
      end_date,
      deadline
    });

    // --- NOTIFICATION MATCHING ENGINE ---
    try {
      if (skill_set && Array.isArray(skill_set) && skill_set.length > 0) {
        // 1. Find all Skill objects whose names match the requested skill_set (case-insensitive regex)
        const regexSkills = skill_set.map(s => new RegExp('^' + s.trim() + '$', 'i'));
        const matchedSkillsInDB = await Skill.find({ name: { $in: regexSkills } });
        const matchedSkillIds = matchedSkillsInDB.map(s => s._id);

        if (matchedSkillIds.length > 0) {
          // 2. Find all Student Profiles that possess ANY of those skill IDs
          const matchedProfiles = await StudentProfile.find({ skills: { $in: matchedSkillIds } });

          // 3. Create a unique Notification for every matched student user_id
          const notificationsToInsert = matchedProfiles.map(profile => ({
            user_id: profile.student_id,
            internship_id: internship._id,
            message: `A new ${title} internship was posted that matches your skills!`,
            read_status: false
          }));

          if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert);
            console.log(`Generated ${notificationsToInsert.length} notifications for new internship.`);
          }
        }
      }
    } catch (e) {
      console.error('Error in Notification Matching Engine:', e.message);
    }

    res.status(201).json(internship);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------ NOTIFICATIONS ------------------ */

// fetch logged-in user's unread notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const notifications = await Notification.find({ user_id: token })
      .populate({
         path: 'internship_id',
         populate: { path: 'company_id', select: 'name' }
      })
      .sort({ created_at: -1 });
      
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// mark a notification as read
app.patch('/api/notifications/:id/read', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: token },
      { read_status: true },
      { new: true }
    );
    
    if (!notif) return res.status(404).json({ error: 'Notification not found' });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// get all internships
app.get('/api/internships', async (req, res) => {
  try {
    const internships = await Internship.find()
      .populate('company_id', 'name website')
      .sort({ deadline: 1, createdAt: -1 });
    res.json(internships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin: delete internship
app.delete('/api/internships/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const user = await User.findById(token);
    if (!user || !['main_admin', 'dept_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admins can delete internships' });
    }

    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    if (user.role === 'dept_admin' && internship.admin_dept !== user.department) {
      return res.status(403).json({ error: 'Cannot delete internship from another department' });
    }

    await Internship.findByIdAndDelete(req.params.id);
    await Application.deleteMany({ internship_id: req.params.id });
    await Notification.deleteMany({ internship_id: req.params.id });

    res.json({ message: 'Internship deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin: edit internship
app.put('/api/internships/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const user = await User.findById(token);
    if (!user || !['main_admin', 'dept_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admins can edit internships' });
    }

    const internship = await Internship.findById(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    if (user.role === 'dept_admin' && internship.admin_dept !== user.department) {
      return res.status(403).json({ error: 'Cannot edit internship from another department' });
    }

    const updateData = { ...req.body };
    if (user.role === 'dept_admin') {
      updateData.admin_dept = user.department;
    }

    const updatedInternship = await Internship.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(updatedInternship);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ AUTH ------------------ */

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(token);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60000); // 10 mins
    await user.save();

    if (transporter) {
      let info = await transporter.sendMail({
        from: '"Unified Internship Navigator" <admin@ajce.in>',
        to: email,
        subject: "Password Reset OTP",
        text: `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
        html: `<b>Your OTP for password reset is: ${otp}</b><br>It will expire in 10 minutes.`
      });
      console.log("OTP Email sent: %s", info.messageId);
      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      
      res.json({ message: 'OTP sent to your email successfully.' });
    } else {
      res.status(500).json({ error: 'Mail service is not running at the moment.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    if (user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ error: 'OTP has expired' });
    }

    user.password = newPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// simple login (no JWT, token = user _id)
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password }); // demo only

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = user._id.toString();

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// current logged-in user
app.get('/api/me', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    const user = await User.findById(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all companies (used to populate dropdowns)
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.find().sort({ name: 1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new company dynamically from Admin dashboard
app.post('/api/companies', async (req, res) => {
  try {
    const { name, website, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Company name required' });
    
    // Check if it exists to avoid dupes silently
    let exist = await Company.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (exist) return res.status(200).json(exist);
    
    const company = await Company.create({ name, website, email });
    res.status(201).json(company);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// TEMP: seed demo users (run once)
app.post('/api/seed-users', async (req, res) => {
  try {
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await FacultyProfile.deleteMany({});
    await AdminProfile.deleteMany({});
    await StudentMentor.deleteMany({});
    await Company.deleteMany({});

    // 1. Create Main Admin
    const mainAdminUser = await User.create({
      name: 'Main Placement Admin',
      email: 'placement@college.in',
      password: 'admin123',
      role: 'main_admin',
      department: 'All'
    });

    await AdminProfile.create({
      admin_id: mainAdminUser._id,
      dept: 'Placement',
      email: mainAdminUser.email,
      phn: '1122334455'
    });

    // 2. Create A Mock Company
    await Company.create({
      name: 'Tech Corp',
      website: 'www.techcorp.com',
      email: 'hr@techcorp.com'
    });

    res.json({ message: 'Seeded successfully, created Main Admin and Company.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ USER CREATION ------------------ */

// Create Dept Admin or Faculty (By Main Admin)
app.post('/api/admin/users', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const authUser = await User.findById(token);
    
    if (!authUser || !['main_admin', 'dept_admin'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    const { name, email, password, role, department, designation, phone } = req.body;
    
    // Authorization Logic Restrictions
    if (authUser.role === 'main_admin' && role !== 'dept_admin') {
      return res.status(403).json({ error: 'Main Admin can only create Department Admins' });
    }
    
    if (authUser.role === 'dept_admin') {
      if (role !== 'faculty') {
        return res.status(403).json({ error: 'Department Admins can only create Faculty' });
      }
      if (department !== authUser.department) {
        return res.status(403).json({ error: 'You can only assign faculty to your own department' });
      }
    }
    
    // Check if exists
    let exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: 'User already exists' });

    const newUser = await User.create({
      name, email, password, role, department
    });

    if (role === 'dept_admin') {
      await AdminProfile.create({
        admin_id: newUser._id,
        dept: department,
        email: email,
        phn: phone || ''
      });
    } else if (role === 'faculty') {
      await FacultyProfile.create({
        user: newUser._id,
        fac_id: `FAC-${Date.now()}`,
        dept: department,
        designation: designation || 'Assistant Professor',
        email: email,
        phone: phone || ''
      });
    }

    res.status(201).json(newUser);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Get list of users (dept admins and faculty) for management
app.get('/api/admin/users', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const authUser = await User.findById(token);
    
    if (!authUser || !['main_admin', 'dept_admin'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Only admins can view users' });
    }

    let filter = { role: { $in: ['dept_admin', 'faculty'] } };
    if (authUser.role === 'dept_admin') {
      filter = { role: 'faculty', department: authUser.department };
    }

    const users = await User.find(filter).select('-password').sort({ role: 1, name: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single user's detailed info (User + Profile)
app.get('/api/admin/users/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const authUser = await User.findById(token);
    
    if (!authUser || !['main_admin', 'dept_admin'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Only admins can view users' });
    }

    const targetUser = await User.findById(req.params.id).select('-password');
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (authUser.role === 'dept_admin') {
      if (targetUser.role !== 'faculty' || targetUser.department !== authUser.department) {
        return res.status(403).json({ error: 'Cannot view this user' });
      }
    }

    let profile = null;
    if (targetUser.role === 'dept_admin') {
      profile = await AdminProfile.findOne({ admin_id: targetUser._id });
    } else if (targetUser.role === 'faculty') {
      profile = await FacultyProfile.findOne({ user: targetUser._id });
    }

    res.json({ user: targetUser, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin: edit user
app.put('/api/admin/users/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const authUser = await User.findById(token);
    
    if (!authUser || !['main_admin', 'dept_admin'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Only admins can edit users' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (authUser.role === 'main_admin' && targetUser.role === 'main_admin') {
      return res.status(403).json({ error: 'Cannot edit main_admin this way' });
    }

    if (authUser.role === 'dept_admin') {
      if (targetUser.role !== 'faculty' || targetUser.department !== authUser.department) {
        return res.status(403).json({ error: 'Cannot edit this user' });
      }
    }

    const { name, email, password, department, phone, designation } = req.body;
    
    // Update User model
    if (name) targetUser.name = name;
    if (email) targetUser.email = email;
    if (password) targetUser.password = password;
    if (department && authUser.role === 'main_admin') {
      targetUser.department = department;
    }
    await targetUser.save();

    // Update Profile models
    if (targetUser.role === 'dept_admin') {
      let profile = await AdminProfile.findOne({ admin_id: targetUser._id });
      if (profile) {
        if (department && authUser.role === 'main_admin') profile.dept = department;
        if (email) profile.email = email;
        if (phone !== undefined) profile.phn = phone;
        await profile.save();
      }
    } else if (targetUser.role === 'faculty') {
      let profile = await FacultyProfile.findOne({ user: targetUser._id });
      if (profile) {
        if (department && authUser.role === 'main_admin') profile.dept = department;
        if (email) profile.email = email;
        if (phone !== undefined) profile.phone = phone;
        if (designation) profile.designation = designation;
        await profile.save();
      }
    }

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin: remove faculty or dept_admin
app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const authUser = await User.findById(token);
    
    if (!authUser || !['main_admin', 'dept_admin'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Only admins can remove users' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (authUser.role === 'main_admin') {
      if (targetUser.role === 'main_admin') {
        return res.status(403).json({ error: 'Cannot remove main_admin' });
      }
    } else if (authUser.role === 'dept_admin') {
      if (targetUser.role !== 'faculty') {
        return res.status(403).json({ error: 'Dept Admins can only remove Faculty' });
      }
      if (targetUser.department !== authUser.department) {
        return res.status(403).json({ error: 'You can only remove faculty from your own department' });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    if (targetUser.role === 'dept_admin') {
      await AdminProfile.findOneAndDelete({ admin_id: targetUser._id });
    } else if (targetUser.role === 'faculty') {
      const facProfile = await FacultyProfile.findOneAndDelete({ user: targetUser._id });
      if (facProfile) {
        await StudentMentor.deleteMany({ faculty: facProfile._id });
      }
    }

    res.json({ message: 'User removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Student (By Faculty)
app.post('/api/faculty/students', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const { error, user, facultyProfile } = await getFacultyAndStudentProfileIdsFromToken(token);
    if (error) return res.status(403).json({ error });

    const { name, email, password, admission_no, batch, sem, branch, phn } = req.body;
    
    let exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: 'Student email already exists' });

    const newStudent = await User.create({
      name,
      email,
      password,
      role: 'student',
      department: user.department
    });

    const studentProfile = await StudentProfile.create({
      student_id: newStudent._id,
      admission_no,
      dept: user.department,
      batch,
      sem,
      branch,
      phn,
      cgpa: 0
    });

    await StudentMentor.create({
      student: studentProfile._id,
      faculty: facultyProfile._id
    });

    res.status(201).json({ user: newStudent, profile: studentProfile });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// get single student (By Faculty)
app.get('/api/faculty/students/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const { error } = await getFacultyAndStudentProfileIdsFromToken(token);
    if (error) return res.status(403).json({ error });

    const studentUser = await User.findById(req.params.id).select('-password');
    if (!studentUser || studentUser.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }
    const studentProfile = await StudentProfile.findOne({ student_id: req.params.id });

    // For now we don't strictly assert the mapping to allowing reading general info
    res.json({ user: studentUser, profile: studentProfile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// modify student (By Faculty)
app.put('/api/faculty/students/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const { error, user } = await getFacultyAndStudentProfileIdsFromToken(token);
    if (error) return res.status(403).json({ error });

    const studentUser = await User.findById(req.params.id);
    if (!studentUser || studentUser.role !== 'student') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const { name, email, password, admission_no, batch, sem, branch, phn } = req.body;
    
    if (name) studentUser.name = name;
    if (email) studentUser.email = email;
    if (password) studentUser.password = password;
    await studentUser.save();

    let studentProfile = await StudentProfile.findOne({ student_id: studentUser._id });
    if (studentProfile) {
      if (admission_no) studentProfile.admission_no = admission_no;
      if (batch) studentProfile.batch = batch;
      if (sem) studentProfile.sem = sem;
      if (branch) studentProfile.branch = branch;
      if (phn !== undefined) studentProfile.phn = phn;
      await studentProfile.save();
    }

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ STUDENT PROFILE (with Skill IDs) ------------------ */

// create or update student profile

app.post('/api/profile', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    console.log(' NEW PROFILE SAVE - DOMAINS + SKILLS');
    const { domains = [], domainSkills = {}, skills = [], department, batch, branch, sem, phn, admission_no, linkedin, githubUrl, portfolioUrl, resume_url, cgpa } = req.body;
    
    // 1. VALIDATE domains exist
    const domainIdsMap = {};
    for (const domainName of domains) {
      let domain = await Domain.findOne({ name: domainName });
      if (!domain) {
        domain = await Domain.create({ name: domainName });
      }
      domainIdsMap[domainName] = domain._id;
    }

    // 2. CREATE SKILLS PER DOMAIN
    const skillIds = [];
    
    // Method 1: domainSkills format {web: ["React", "Node"]}
    for (const [domainName, skillNames] of Object.entries(domainSkills)) {
      const domainId = domainIdsMap[domainName];
      if (!domainId) continue;
      
      for (const skillName of skillNames) {
        const cleanSkill = skillName.trim();
        if (!cleanSkill) continue;
        
        let skill = await Skill.findOne({ name: cleanSkill, domain: domainId });
        if (!skill) {
          skill = await Skill.create({ 
            name: cleanSkill, 
            domain: domainId 
          });
        }
        skillIds.push(skill._id);
      }
    }

    // Method 2: Fallback for old skills array
    if (skillIds.length === 0 && skills.length > 0) {
      const firstDomainId = Object.values(domainIdsMap)[0];
      if (firstDomainId) {
        for (const skillName of skills) {
          const cleanSkill = skillName.toString().trim();
          let skill = await Skill.findOne({ name: cleanSkill, domain: firstDomainId });
          if (!skill) {
            skill = await Skill.create({ name: cleanSkill, domain: firstDomainId });
          }
          skillIds.push(skill._id);
        }
      }
    }

    // 3. SAVE PROFILE WITH ObjectIds ONLY
    const profile = await StudentProfile.findOneAndUpdate(
      { student_id: token },
      {
        student_id: token,
        dept: department,
        batch,
        branch,
        sem,
        phn,
        admission_no,
        linkedin,
        cgpa,
        domains: Object.values(domainIdsMap),        // Array of ObjectIds
        skills: skillIds,                            // Array of Skill ObjectIds
        projects: req.body.projects || [],
        resume_url,
        githubUrl,
        portfolioUrl,
      },
      { new: true, upsert: true }
    );

    res.json(profile);
  } catch (err) {
    console.error(' ERROR:', err);
    require('fs').appendFileSync('error_log.txt', new Date().toISOString() + ' ERROR in /api/profile: ' + err.message + '\nPAYLOAD: ' + JSON.stringify(req.body) + '\n\n');
    res.status(400).json({ error: err.message });
  }
});

// get profile by token
app.get('/api/profile', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    let profile = await StudentProfile.findOne({ student_id: token })
      .populate({
        path: 'skills',
        populate: { path: 'domain', select: 'name' }
      })
      .populate('domains', 'name')
      .populate('student_id', 'name email department');

    if (!profile) return res.json(null);

    const plain = profile.toObject();
    
    // Format response to match frontend expectations
    plain.studentName = plain.student_id ? plain.student_id.name : '';
    plain.studentEmail = plain.student_id ? plain.student_id.email : '';
    plain.department = plain.student_id ? plain.student_id.department : plain.dept;
    
    plain.domains = (plain.domains || []).map(d => d.name || d);
    
    // Reconstruct domainSkills mapping for the frontend: { "web": ["React", "Node"] }
    const domainSkillsMap = {};
    (profile.skills || []).forEach(skill => {
        if (!skill.domain || !skill.domain.name) return;
        const domName = skill.domain.name;
        if(!domainSkillsMap[domName]) domainSkillsMap[domName] = [];
        domainSkillsMap[domName].push(skill.name);
    });
    
    plain.domainSkills = domainSkillsMap;
    // Keep flat array for backwards compat if needed
    plain.skills = (plain.skills || []).map(s => s.name);

    res.json(plain);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ APPLICATIONS ------------------ */

// student applies to internship
app.post('/api/applications', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    const user = await User.findById(token);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can apply' });
    }

    const { internshipId } = req.body;

    const profile = await StudentProfile.findOne({ student_id: user._id }).populate('skills', 'name');

    const applicationData = {
      student_id: user._id,
      internship_id: internshipId,
      status: 'Applied',
      facultyApprovalStatus: 'Pending',
      department: user.department 
    };

    if (profile) {
      applicationData.cgpa = profile.cgpa ?? applicationData.cgpa;
      if (profile.skills && profile.skills.length) {
        applicationData.skills = profile.skills.map(s => s.name);
      }
    }

    const application = await Application.create(applicationData);
    io.emit('new-application', application);
    res.status(201).json(application);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// admin: view all applications with filters/sort
app.get('/api/applications', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const user = await User.findById(token);
    if (!user || !['main_admin', 'dept_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admins can view all applications' });
    }

    const {
      status,
      department,
      minCgpa,
      skill,
      sortBy = 'appliedAt',
      sortOrder = 'desc',
    } = req.query;

    const filter = {};
    // Dept admin can only see their department
    if (user.role === 'dept_admin') {
      filter.department = user.department;
    } else if (department) {
      filter.department = department;
    }

    if (status) filter.status = status;
    if (minCgpa) filter.cgpa = { $gte: Number(minCgpa) };
    if (skill) filter.skills = { $in: [skill] };

    const sort = {};
    const allowedSort = ['applied_at', 'cgpa'];
    if (allowedSort.includes(sortBy)) {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort.applied_at = -1;
    }

    const apps = await Application.find(filter)
      .populate({
         path: 'internship_id',
         select: 'title admin_dept skill_set company_id',
         populate: { path: 'company_id', select: 'name' }
      })
      .populate('student_id', 'name email department')
      .sort(sort);

    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// admin: update application status
app.patch('/api/applications/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) return res.status(401).json({ error: 'Not logged in' });
    const user = await User.findById(token);
    if (!user || !['main_admin', 'dept_admin'].includes(user.role)) {
      return res.status(403).json({ error: 'Only admins can update applications' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const existingApp = await Application.findById(req.params.id);
    if (!existingApp) return res.status(404).json({ error: 'Application not found' });
    
    if (user.role === 'dept_admin' && existingApp.department !== user.department) {
       return res.status(403).json({ error: 'Cannot modify application from another department' });
    }

    const appDoc = await Application.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate({
         path: 'internship_id',
         select: 'title admin_dept skill_set company_id',
         populate: { path: 'company_id', select: 'name' }
      })
      .populate('student_id', 'name email department');

    if (!appDoc) {
      return res.status(404).json({ error: 'Application not found' });
    }

    io.emit('application-updated', appDoc);
    res.json(appDoc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// student: my applications
app.get('/api/my-applications', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    if (!token) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const user = await User.findById(token);
    if (!user || user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can view this' });
    }

    const apps = await Application.find({ student_id: user._id })
      .populate({
        path: 'internship_id',
        select: 'title company_id',
        populate: {
          path: 'company_id',
          select: 'name'
        }
      })
      .sort({ applied_at: -1 });

    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ FACULTY ENDPOINTS ------------------ */

// applications from this faculty's students
app.get('/api/faculty/applications', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const { error, studentProfileIds } =
      await getFacultyAndStudentProfileIdsFromToken(token);

    if (error) return res.status(403).json({ error });

    const studentProfiles = await StudentProfile
      .find({ _id: { $in: studentProfileIds } })
      .select('student_id');

    const userIds = studentProfiles.map(p => p.student_id);

    const apps = await Application.find({ student_id: { $in: userIds } })
      .populate({
         path: 'internship_id',
         select: 'title admin_dept skill_set company_id',
         populate: { path: 'company_id', select: 'name' }
      })
      .populate('student_id', 'name email department')
      .sort({ applied_at: -1 });

    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// faculty approve/reject application
app.patch('/api/faculty/applications/:id', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const { error, studentProfileIds } =
      await getFacultyAndStudentProfileIdsFromToken(token);
    if (error) return res.status(403).json({ error });

    const { status } = req.body; // 'Approved' or 'Rejected'
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const appDoc = await Application.findById(req.params.id);
    if (!appDoc) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const profiles = await StudentProfile
      .find({ _id: { $in: studentProfileIds } })
      .select('student_id');

    const authorizedUserIds = profiles.map(p => p.student_id.toString());
    if (!authorizedUserIds.includes(appDoc.student_id.toString())) {
      return res.status(403).json({ error: 'Not your student' });
    }

    appDoc.facultyApprovalStatus = status;
    await appDoc.save();

    res.json(appDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// faculty list of students
app.get('/api/faculty/students', async (req, res) => {
  try {
    const token = req.headers['x-auth-token'];
    const { error, studentProfileIds } =
      await getFacultyAndStudentProfileIdsFromToken(token);
    if (error) return res.status(403).json({ error });

    const students = await StudentProfile.find({ _id: { $in: studentProfileIds } })
      .populate('student_id', 'name email department')
      .populate('skills', 'name');

    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ ROOT ------------------ */

app.get('/', (req, res) => {
  res.send('API running');
});

// Temporarily auto-seed strictly if the database doesn't have the Main Admin
async function autoSeedFallback() {
  const adminDoc = await User.findOne({role: 'main_admin'});
  if (!adminDoc) {
    console.log('--- AUTO SEEDING DB: Main Admin missing ---');
    try {
        await User.deleteMany({});
        await StudentProfile.deleteMany({});
        await FacultyProfile.deleteMany({});
        await AdminProfile.deleteMany({});
        await StudentMentor.deleteMany({});
        await Company.deleteMany({});

        // 1. Create Main Admin
        const mainAdminUser = await User.create({
          name: 'Main Placement Admin',
          email: 'placement@college.in',
          password: 'admin123',
          role: 'main_admin',
          department: 'All'
        });

        await AdminProfile.create({
          admin_id: mainAdminUser._id,
          dept: 'Placement',
          email: mainAdminUser.email,
          phn: '1122334455'
        });

        // 2. Create A Mock Company
        const comp = await Company.create({
          name: 'Tech Corp',
          website: 'www.techcorp.com',
          email: 'hr@techcorp.com'
        });

        console.log('--- AUTO SEED SUCCESSFUL ---');
    } catch(err) {
        console.error('AUTO SEED ERROR:', err);
    }
  }
}

const PORT = process.env.PORT || 5001;
server.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`);
    await autoSeedFallback();
});
