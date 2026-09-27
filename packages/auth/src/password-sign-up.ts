import "@crm/env/load";

// Email + password accounts are invite-only. Nothing confirms that a person
// owns the address they type, so the domain-wide ALLOWED_SIGN_IN list is not
// enough on its own here: only the exact addresses in PASSWORD_SIGN_UP may
// create a password account. ALLOWED_SIGN_IN still applies on top of this.

const SIGN_UP_PATH = "/sign-up/email";

export function isPasswordSignUp(path: string | null | undefined): boolean {
	return path === SIGN_UP_PATH;
}

export function passwordSignUpAddresses(): string[] {
	return (process.env.PASSWORD_SIGN_UP ?? "")
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter((entry) => entry.includes("@"));
}

export function isPasswordSignUpAllowed(
	email: string | null | undefined,
): boolean {
	const value = email?.trim().toLowerCase();
	if (!value) return false;
	return passwordSignUpAddresses().includes(value);
}
