import 'dotenv/config';
import * as joi from 'joi';

interface EnvConfig {
    PORT: number;
}

const envVarsSchema = joi.object({
    PORT: joi.number().required(),
})
.unknown(true);

const { error, value } = envVarsSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}
const envVars: EnvConfig = value;

export const envs={
port: envVars.PORT
}