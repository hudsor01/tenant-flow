import { describe, expect, it } from "vitest";
import { loginZodSchema, registerZodSchema, signupFormSchema } from "../auth";

describe("loginZodSchema", () => {
	it("accepts valid email and password", () => {
		expect(
			loginZodSchema.safeParse({
				email: "user@example.com",
				password: "password123",
			}).success,
		).toBe(true);
	});
	it("rejects missing email", () => {
		expect(loginZodSchema.safeParse({ password: "password123" }).success).toBe(
			false,
		);
	});
	it("rejects missing password", () => {
		expect(
			loginZodSchema.safeParse({ email: "user@example.com" }).success,
		).toBe(false);
	});
	it("rejects empty password", () => {
		expect(
			loginZodSchema.safeParse({ email: "user@example.com", password: "" })
				.success,
		).toBe(false);
	});
	it("rejects invalid email format", () => {
		expect(
			loginZodSchema.safeParse({
				email: "not-an-email",
				password: "password123",
			}).success,
		).toBe(false);
	});
	it("accepts password of any length >= 1", () => {
		expect(
			loginZodSchema.safeParse({ email: "user@example.com", password: "x" })
				.success,
		).toBe(true);
	});
});

describe("registerZodSchema", () => {
	const validData = {
		email: "user@example.com",
		password: "Password1!aa",
		confirmPassword: "Password1!aa",
	};
	it("accepts valid registration data", () => {
		expect(registerZodSchema.safeParse(validData).success).toBe(true);
	});
	it("rejects mismatched passwords", () => {
		expect(
			registerZodSchema.safeParse({
				...validData,
				confirmPassword: "DifferentPass1",
			}).success,
		).toBe(false);
	});
	it("rejects invalid email", () => {
		expect(
			registerZodSchema.safeParse({ ...validData, email: "bad-email" }).success,
		).toBe(false);
	});
	it("rejects password shorter than 12 characters", () => {
		expect(
			registerZodSchema.safeParse({
				...validData,
				password: "Ab1!",
				confirmPassword: "Ab1!",
			}).success,
		).toBe(false);
	});
	it("rejects password without special character", () => {
		expect(
			registerZodSchema.safeParse({
				...validData,
				password: "Password1aaa",
				confirmPassword: "Password1aaa",
			}).success,
		).toBe(false);
	});
	it("rejects password without uppercase", () => {
		expect(
			registerZodSchema.safeParse({
				...validData,
				password: "password1",
				confirmPassword: "password1",
			}).success,
		).toBe(false);
	});
	it("rejects password without lowercase", () => {
		expect(
			registerZodSchema.safeParse({
				...validData,
				password: "PASSWORD1",
				confirmPassword: "PASSWORD1",
			}).success,
		).toBe(false);
	});
	it("rejects password without number", () => {
		expect(
			registerZodSchema.safeParse({
				...validData,
				password: "Passwords",
				confirmPassword: "Passwords",
			}).success,
		).toBe(false);
	});
	it("rejects missing email", () => {
		expect(
			registerZodSchema.safeParse({
				password: "Password1",
				confirmPassword: "Password1",
			}).success,
		).toBe(false);
	});
});

describe("signupFormSchema", () => {
	const validData = {
		first_name: "John",
		last_name: "Doe",
		email: "john@example.com",
		password: "Password1!aa",
	};
	it("accepts valid signup data", () => {
		expect(signupFormSchema.safeParse(validData).success).toBe(true);
	});
	it("rejects missing first_name", () => {
		const { first_name: _, ...rest } = validData;
		expect(signupFormSchema.safeParse(rest).success).toBe(false);
	});
	it("rejects empty first_name", () => {
		expect(
			signupFormSchema.safeParse({ ...validData, first_name: "" }).success,
		).toBe(false);
	});
	it("rejects missing last_name", () => {
		const { last_name: _, ...rest } = validData;
		expect(signupFormSchema.safeParse(rest).success).toBe(false);
	});
	it("rejects weak password (no uppercase)", () => {
		expect(
			signupFormSchema.safeParse({
				...validData,
				password: "password1",
			}).success,
		).toBe(false);
	});
	it("rejects invalid email", () => {
		expect(
			signupFormSchema.safeParse({ ...validData, email: "not-valid" }).success,
		).toBe(false);
	});
});
