module.exports = {
  apps: [
    {
      name: "aip-project-backend",
      script: "./dist/src/main.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
}
