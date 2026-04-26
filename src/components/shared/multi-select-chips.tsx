'use client'

import { useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { Button } from '#components/ui/button'
import { Checkbox } from '#components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '#components/ui/popover'
import { cn } from '#lib/utils'

export interface MultiSelectOption<T extends string> {
	value: T
	label: string
}

export interface MultiSelectChipsProps<T extends string> {
	options: ReadonlyArray<MultiSelectOption<T>>
	value: ReadonlyArray<T>
	onChange: (next: T[]) => void
	placeholder?: string
	'aria-label'?: string
	className?: string
}

/**
 * Minimal multi-select control: button trigger summarizes selection,
 * popover lists every option with a checkbox. Toggling a checkbox adds
 * or removes that value from the array. Used by the documents vault for
 * the multi-select category filter (Phase 63).
 *
 * Generic over the value type so callers preserve their own union (e.g.
 * `DocumentCategory`) instead of widening to `string`.
 */
export function MultiSelectChips<T extends string>({
	options,
	value,
	onChange,
	placeholder = 'Any',
	'aria-label': ariaLabel,
	className
}: MultiSelectChipsProps<T>) {
	const [open, setOpen] = useState(false)
	const selected = new Set(value)

	const summary = (() => {
		if (selected.size === 0) return placeholder
		if (selected.size === 1) {
			const only = options.find(o => o.value === [...selected][0])
			return only?.label ?? placeholder
		}
		return `${selected.size} selected`
	})()

	function toggle(v: T) {
		if (selected.has(v)) {
			onChange([...selected].filter(x => x !== v) as T[])
		} else {
			onChange([...selected, v] as T[])
		}
	}

	return (
		<div className={cn('flex items-center gap-1', className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className={cn(
							'flex-1 justify-between font-normal',
							selected.size === 0 && 'text-muted-foreground'
						)}
						aria-label={ariaLabel}
					>
						<span className="truncate">{summary}</span>
						<ChevronDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden="true" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-56 p-1" align="start">
					<ul role="listbox" aria-multiselectable="true" className="space-y-0.5">
						{options.map(opt => {
							const checked = selected.has(opt.value)
							return (
								<li key={opt.value}>
									<button
										type="button"
										role="option"
										aria-selected={checked}
										onClick={() => toggle(opt.value)}
										className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
									>
										<Checkbox
											checked={checked}
											tabIndex={-1}
											aria-hidden="true"
										/>
										<span className="flex-1 text-left">{opt.label}</span>
										{checked && <Check className="size-4 text-primary" aria-hidden="true" />}
									</button>
								</li>
							)
						})}
					</ul>
				</PopoverContent>
			</Popover>
			{selected.size > 0 && (
				<Button
					variant="ghost"
					size="sm"
					className="size-9 p-0"
					onClick={() => onChange([])}
					aria-label="Clear selection"
				>
					<X className="size-4" aria-hidden="true" />
				</Button>
			)}
		</div>
	)
}
