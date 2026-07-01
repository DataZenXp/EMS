const mongoose = require('mongoose');

const uri = 'mongodb+srv://clouddterimank_db_user:QIlE94kDewUpUwh5@cluster0.mdq7cns.mongodb.net/ems_production?appName=Cluster0';

async function test() {
  console.log('Connecting to Atlas...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Success! Connected to Atlas.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Failed to connect:', err.message);
  }
}
test();
