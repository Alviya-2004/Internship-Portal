const mongoose = require('mongoose');
const Application = require('./models/Application');
const Skill = require('./models/Skill');

mongoose.connect('mongodb://127.0.0.1:27017/internship_navigator')
  .then(async () => {
    let count = 0;
    const apps = await Application.find();
    
    for (const app of apps) {
       let updated = false;
       const newSkills = [];
       
       for (const skill of app.skills) {
          // If the string length is exactly 24 hex characters, it's an ObjectID
          if (/^[0-9a-fA-F]{24}$/.test(skill)) {
             try {
                const s = await Skill.findById(skill);
                if (s) {
                    newSkills.push(s.name);
                    updated = true;
                } else {
                    newSkills.push(skill);
                }
             } catch(err) {
                newSkills.push(skill);
             }
          } else {
             newSkills.push(skill);
          }
       }
       
       if (updated) {
          app.skills = newSkills;
          await app.save();
          count++;
          console.log(`Updated application ${app._id} with readable skills.`);
       }
    }
    
    console.log(`Successfully migrated ${count} applications.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
