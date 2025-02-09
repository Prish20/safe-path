"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    checkAuth: function() {
        return checkAuth;
    },
    forgotPassword: function() {
        return forgotPassword;
    },
    googleSignIn: function() {
        return googleSignIn;
    },
    resetPassword: function() {
        return resetPassword;
    },
    signin: function() {
        return signin;
    },
    signout: function() {
        return signout;
    },
    signup: function() {
        return signup;
    },
    verifyEmail: function() {
        return verifyEmail;
    }
});
const _usermodel = require("../models/user.model.js");
const _bcryptjs = /*#__PURE__*/ _interop_require_default(require("bcryptjs"));
const _generateVerificationToken = require("../utils/generateVerificationToken.js");
const _crypto = /*#__PURE__*/ _interop_require_default(require("crypto"));
const _generateTokenAndSetCookie = require("../utils/generateTokenAndSetCookie.js");
const _email = require("../mailtrap/email.js");
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _object_spread_props(target, source) {
    source = source != null ? source : {};
    if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
        ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
}
const signup = async (req, res)=>{
    const { firstName, lastName, email, password } = req.body;
    try {
        if (!firstName || !lastName || !email || !password) {
            res.status(400).json({
                error: "All fields are required"
            });
            return;
        }
        const userExist = await _usermodel.User.findOne({
            email
        });
        if (userExist) {
            res.status(400).json({
                error: "User already exists"
            });
            return;
        }
        const hashedPassword = await _bcryptjs.default.hash(password, 10);
        const verificationToken = (0, _generateVerificationToken.generateVerificationToken)();
        const user = new _usermodel.User({
            firstName,
            lastName,
            email,
            verificationToken,
            verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
            password: hashedPassword
        });
        await user.save();
        (0, _generateTokenAndSetCookie.generateTokenAndSetCookie)(res, user._id.toString());
        await (0, _email.sendVerificationEmail)(user.email, verificationToken);
        res.status(201).json({
            message: "User created successfully",
            user: _object_spread_props(_object_spread({}, user.toObject()), {
                password: undefined,
                verificationToken: undefined
            })
        });
    } catch (error) {
        res.status(400).json({
            error: "Something went wrong"
        });
    }
};
const verifyEmail = async (req, res)=>{
    const { code } = req.body;
    try {
        const user = await _usermodel.User.findOne({
            verificationToken: code,
            verificationTokenExpiresAt: {
                $gt: Date.now()
            }
        });
        if (!user) {
            res.status(400).json({
                error: "Invalid or expired verification code"
            });
            return;
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpiresAt = undefined;
        await user.save();
        await (0, _email.sendWelcomeEmail)(user.email, user.firstName);
        res.status(200).json({
            success: true,
            message: "Account verified successfully",
            user: _object_spread_props(_object_spread({}, user.toObject()), {
                password: undefined
            })
        });
    } catch (error) {
        throw new Error(`Error verifying email: ${error}`);
    }
};
const signin = async (req, res)=>{
    const { email, password } = req.body;
    try {
        const user = await _usermodel.User.findOne({
            email
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid email or password. Please try again."
            });
            return;
        }
        const isMatch = user.password ? _bcryptjs.default.compareSync(password, user.password) : false;
        if (!isMatch) {
            res.status(400).json({
                success: false,
                message: "Invalid email or password. Please try again."
            });
            return;
        }
        (0, _generateTokenAndSetCookie.generateTokenAndSetCookie)(res, user._id.toString());
        user.lastLogin = new Date();
        await user.save();
        res.status(200).json({
            success: true,
            message: "Signin successful",
            user: _object_spread_props(_object_spread({}, user.toObject()), {
                password: undefined
            })
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};
const signout = async (_, res)=>{
    res.clearCookie("token");
    res.status(200).json({
        message: "Signout successful"
    });
};
const forgotPassword = async (req, res)=>{
    const { email } = req.body;
    try {
        const user = await _usermodel.User.findOne({
            email
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "The email does not exist.Please enter the correct email."
            });
            return;
        }
        const resetToken = _crypto.default.randomBytes(32).toString("hex");
        const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000;
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiresAt = new Date(resetTokenExpiresAt);
        await user.save();
        await (0, _email.sendResetPasswordEmail)(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);
        res.status(200).json({
            success: true,
            message: "Password reset link sent to your email"
        });
    } catch (error) {
        console.error(`Error sending email: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const resetPassword = async (req, res)=>{
    try {
        const { token } = req.params;
        const { password } = req.body;
        const user = await _usermodel.User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiresAt: {
                $gt: Date.now()
            }
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
            return;
        }
        if (!user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired reset token"
            });
            return;
        }
        user.password = _bcryptjs.default.hashSync(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpiresAt = undefined;
        await user.save();
        await (0, _email.sendResetSuccessEmail)(user.email);
        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    } catch (error) {
        console.error(`Error resetting password: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const checkAuth = async (req, res)=>{
    try {
        const user = await _usermodel.User.findById(req.userId).select("-password");
        if (!user) {
            res.status(401).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error(`Error checking auth: ${error}`);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
const googleSignIn = async (req, res)=>{
    const { firstName, lastName, email, photoURL } = req.body;
    try {
        if (!firstName || !lastName || !email) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }
        let user = await _usermodel.User.findOne({
            email
        });
        if (user) {
            user.lastLogin = new Date();
            user.photoURL = photoURL || user.photoURL;
            await user.save();
        } else {
            user = new _usermodel.User({
                firstName,
                lastName,
                email,
                photoURL,
                isVerified: true,
                lastLogin: new Date()
            });
            await user.save();
        }
        (0, _generateTokenAndSetCookie.generateTokenAndSetCookie)(res, user._id.toString());
        return res.status(200).json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            photoURL: user.photoURL,
            isVerified: user.isVerified,
            lastLogin: user.lastLogin
        });
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        return res.status(500).json({
            error: "Authentication failed"
        });
    }
};
