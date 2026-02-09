export default () => ({
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/astracore',
  superUserEmail: process.env.SUPER_USER_EMAIL,
  superUserPassword: process.env.SUPER_USER_PASSWORD,
  jwtSecret: process.env.JWT_SECRET || process.env.JWT_SECRET_KEY,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});
