/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "notification-service",
  deploymentTarget: "15.0",
  frameworks: ["UserNotifications", "Intents"],
  entitlements: {
    "com.apple.developer.usernotifications.communication": true,
  },
};
