// const express = require("express");
// const router = express.Router();
// const { loginUser } = require("../controller/authController");


// router.post("/", loginUser);

// module.exports = router;



const express = require("express")
const router = express.Router()
const { loginUser } = require("../controller/authController")

router.post("/", loginUser)

module.exports = router
