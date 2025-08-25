module.exports = {
  // Custom categories for test grouping
  categories: [
    {
      name: "🏠 Homepage Verification",
      messageRegex: ".*landing page.*",
      traceRegex: ".*homepage.*"
    },
    {
      name: "📧 Contact Page Tests", 
      messageRegex: ".*contact.*",
      traceRegex: ".*contact.*"
    },
    {
      name: "🏷️ Banner Loading Tests",
      messageRegex: ".*banner.*",
      traceRegex: ".*banner.*"
    },
    {
      name: "💰 Discount & Offer Tests",
      messageRegex: ".*discount.*|.*offer.*",
      traceRegex: ".*discount.*"
    },
    {
      name: "🏨 Reservation Tests",
      messageRegex: ".*reservation.*",
      traceRegex: ".*reservation.*"
    },
    {
      name: "🔍 Product defects",
      messageRegex: ".*product.*",
      traceRegex: ".*"
    },
    {
      name: "⚠️ Test defects", 
      messageRegex: ".*test.*",
      traceRegex: ".*"
    }
  ],
  
  // Environment information
  environment: {
    "Test Environment": "Local Development",
    "Framework": "Playwright + TypeScript",
    "Browser": "Chrome",
    "OS": process.platform,
    "Node Version": process.version,
    "Test Type": "End-to-End",
    "Project": "Storagely Storage Sites",
    "Tester": "QA Automation Team",
    "Build": "v1.0.0"
  }
};
