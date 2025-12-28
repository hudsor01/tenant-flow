export type Payload<ValueType = number, NameType = string> = {
	name?: NameType
	value?: ValueType
	payload?: unknown
}
