import { useState } from 'react'

export interface FormState {
	isLoading: boolean
	error: string | null
	success: boolean
}

export function useFormState() {
	return useState<FormState>({
		isLoading: false,
		error: null,
<<<<<<< HEAD
		success: false
	})
}
=======
		success: false,
	})
}
>>>>>>> origin/main
