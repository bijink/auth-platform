import * as Joi from 'joi'

export default Joi.object({
  NODE_ENV: Joi.string().valid('test', 'staging'),
  JWT_ACCESS_SECRET_KEY: Joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1w'),
  JWT_REFRESH_SECRET_KEY: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('2w'),
})
