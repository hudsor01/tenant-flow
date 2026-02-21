import * as dotenv from 'dotenv'
import * as path from 'path'

// Load from monorepo root .env.local first, then .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })
