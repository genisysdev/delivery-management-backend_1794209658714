import mongoose from 'mongoose';
import AppUser from '../models/app-user.model.js';
import skillMaster from '../models/skill.model.js';
import AppScope from '../models/app-scope.model.js';
import fs from 'fs';
import path from 'path';
import connectDB from '../config/db.js';
import { fileURLToPath } from 'url';
import { loadEmployees } from './seedEmployee.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDefaultAppUsers() {
  const dataPath = path.join(__dirname, '../seeder/data/app-users.json');
  const appUsers = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const user of appUsers) {
    await AppUser.updateOne(
      { email: user.email },
      { $setOnInsert: user },
      { upsert: true }
    );
  }

  console.log('App users seeded successfully');
}

async function seedSkillMasterData() {
  const dataPath = path.join(__dirname, '../seeder/data/skillMasterData.json');
  const skills = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const skill of skills) {
    await skillMaster.updateOne(
      { skillName: skill.skillName },
      { $set: skill },
      { upsert: true }
    );
  }

  console.log('Skill Master data seeded successfully');
}

async function seedAppScopeData() {
  const dataPath = path.join(__dirname, '../seeder/data/app-scope.json');
  const scopes = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  for (const scope of scopes) {
    await AppScope.updateOne(
      { role: scope.role },
      { $set: scope },
      { upsert: true }
    );
  }

  console.log('App Scope data seeded successfully');
}

const seedData = async () => {
  try {
    await connectDB();

    await seedDefaultAppUsers();
    await seedSkillMasterData();
    await loadEmployees();
    await seedAppScopeData();
    mongoose.connection.close();
    console.log('Seeder completed and connection closed');
  } catch (error) {
    console.error('Error seeding app users:', error);
    process.exit(1);
  }
};

seedData();