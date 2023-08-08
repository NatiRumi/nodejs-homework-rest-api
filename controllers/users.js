const { registerSchema } = require("../schemas");
const { emailSchema } = require("../schemas");
const { loginSchema } = require("../schemas");
const { HttpError, sendEmail } = require("../helpers");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");
const {nanoid} = require("nanoid");

const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const User = require("../models/user");

dotenv.config();

const register = async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    
    if (error) {
      throw HttpError(400, error.message);
    }
    
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      throw HttpError(409, "Email already in use");
    }

    const hashPassword = await bcrypt.hash(password, 10);
    const avatarURL = gravatar.url(email);
    const verificationToken = nanoid();

    const newUser = await User.create({ ...req.body, password: hashPassword, avatarURL, verificationToken });

    const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${process.env.BASE_URL}/api/users/verify/${verificationToken}">Click verify email</a>`
    };

    await sendEmail(verifyEmail);

    res.status(201).json({
      user: newUser.email,
      email: newUser.email,
      password: newUser.password,
    });
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async(req, res, next)=> {
  try {
    const {verificationCode} = req.params;
    const user = await User.findOne({verificationCode});

    if(!user){
        throw HttpError(404, "User not found")
    }

    await User.findByIdAndUpdate(user._id, {verify: true, verificationToken: null});

    res.json({
        message: "Verification successful"
    })
  } 
  catch (error) {
    next(error);
  }
};

const resendVerifyEmail = async(req, res, next)=> {
  try {
    const { error } = emailSchema.validate(req.body);

    if (error) {
      throw HttpError(400, error.message);
    }

    const {email} = req.body;
    const user = await User.findOne({email});

    if(!email) {
      throw HttpError(400, "Missing required field email");
    }

    if(!user) {
      throw HttpError(401, "User not found");
    }

    if(user.verify) {
      throw HttpError(400, "Verification has already been passed");
    }

    const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${process.env.BASE_URL}/api/users/verify/${user.verificationToken}">Click verify email</a>`
    };

    await sendEmail(verifyEmail);

    res.json({
      message: "Verification email sent"
    })
  } 
  catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { error } = loginSchema.validate(req.body);

    if (error) {
      throw HttpError(400, error.message);
    }

    const { email, password, subscription } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(401, "Email or password invalid");
    }

    if(!user.verify) {
      throw HttpError(401, "Email not verified");
    }

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw HttpError(401, "Email or password is wrong");
    }

    const payload = {
      id: user._id,
    };

    const token = jwt.sign(payload, process.env.SECRET_KEY, {
      expiresIn: "23h",
    });

    await User.findByIdAndUpdate(user._id, {token});

    res.json({
      token,
      user: email,
      email: email,
      subscription: subscription,
    });
  } catch (error) {
    next(error);
  }
};

const getCurrent = async (req, res, next) => {
  try {
    const { email, name } = req.user;

    res.json({
      email,
      name,
    });
  } 
  catch (error) {
    next(error);
  }
};

const logout = async(req, res, next) => {
  try {
    const {_id} = req.user;
    await User.findByIdAndUpdate(_id, {token: ""});
    res.json({
      message: "Logout success, No Content"
  })
  } 
  catch (error) {
    next(error);
  }
}

const updateAvatar = async(req, res, next)=> {
  try {
    console.log("avatar")
    const {path: tempUpload, originalname} = req.file;
    const {_id} = req.user;
    const filename = `${_id}_${originalname}`;
    const resultUpload = path.join(avatarsDir, filename);
    await fs.rename(tempUpload, resultUpload);
    const avatarURL = path.join("avatars", filename);
    await User.findByIdAndUpdate(_id, {avatarURL});

    res.json({
      avatarURL,
    })
  } 
  catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  verifyEmail,
  resendVerifyEmail,
  login,
  getCurrent,
  logout,
  updateAvatar,
};
