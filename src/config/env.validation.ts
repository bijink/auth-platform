import * as Joi from 'joi'

export default Joi.object({
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_ACCESS_SECRET_KEY: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1w'),
  JWT_REFRESH_SECRET_KEY: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('2w'),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(10),
})
