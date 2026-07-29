const jwt = require("jsonwebtoken");
const User = require("../model/userModel"); // Adjust path if needed

const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from "Authorization" header
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Optional: Validate user from DB if needed
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Attach user info to request object
    req.user = {
      id: user._id,
      email: user.email,
      crmType: user.crmType,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired." });
    }

    res.status(500).json({
      success: false,
      message: "Authentication failed.",
      error: error.message,
    });
  }
};

module.exports = authMiddleware;
