import { Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { randomUUID } from 'node:crypto'
import {
	ConfigurableModuleClass,
	MODULE_OPTIONS_TOKEN,
	type ContextModuleOptions
} from './context.module-definition'

@Module({
	imports: [
		ClsModule.forRootAsync({
			useFactory: (options: ContextModuleOptions) => ({
				...options,
				middleware: {
					mount: true,
					setup: (cls, req) => {
						cls.set('REQUEST_CONTEXT', {
							requestId: randomUUID(),
							startTime: Date.now(),
							path: req.url,
							method: req.method
						})
					}
				}
			}),
			inject: [MODULE_OPTIONS_TOKEN]
		})
	],
	exports: [ClsModule]
})
export class ContextModule extends ConfigurableModuleClass {}
