import { Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'
import { randomUUID } from 'node:crypto'
import {
	ConfigurableModuleClass,
	type ContextModuleOptions
} from './context.module-definition'

@Module({})
export class ContextModule extends ConfigurableModuleClass {
	static override forRoot(options: ContextModuleOptions = {}) {
		return {
			module: ContextModule,
			imports: [
				ClsModule.forRoot({
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
				})
			],
			exports: [ClsModule]
		}
	}
}
