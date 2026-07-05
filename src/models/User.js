const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false
    },
    avatar: {
      type: String,
      default: ''
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    availability: {
      type: String,
      default: 'Available',
      enum: ['Available', 'In Deep Work', 'Out of Office']
    },
    clockStatus: {
      type: String,
      default: 'OUT',
      enum: ['IN', 'OUT']
    },
    lastClockIn: {
      type: Date,
      default: null
    },
    lastClockOut: {
      type: Date,
      default: null
    },
    totalMinutesToday: {
      type: Number,
      default: 0
    },
    totalMinutesAllTime: {
      type: Number,
      default: 0
    },
    lastClockDate: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Compare plain password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
