const express = require("express");
const axios = require("axios").default;
const config = require("../config");

let router = express.Router();

// Endpoint to return a 2-legged access token
router.get("/token", async (req, res, next) => {
  try {
    const params = new URLSearchParams();
    params.append("client_id", config.credentials.client_id);
    params.append("client_secret", config.credentials.client_secret);
    params.append("grant_type", "client_credentials");
    params.append("scope", "data:read");
    const response = await axios.post(
      "https://developer.api.autodesk.com/authentication/v1/authenticate",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    res.json(response.data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
