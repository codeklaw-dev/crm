import "@crm/env/load";

// Who may create an email + password account. PASSWORD_SIGN_UP is a
// comma-separated list of whole domains ("racoai.io") and/or single addresses
// ("someone@gmail.com"). ALLOWED_SIGN_IN still applies on top of this.
//
// Note: addresses are not verified by email, so a domain entry lets anyone who
// types an address at that domain create an account.

const SIGN_UP_PATH = "/sign-up/email";

export function isPasswordSignUp(path: string | null | undefined): boolean {
	return path === SIGN_UP_PATH;
}

function passwordSignUpList(): { domains: string[]; addresses: string[] } {
	const domains: string[] = [];
	const addresses: string[] = [];

	for (const raw of (process.env.PASSWORD_SIGN_UP ?? "").split(",")) {
		const entry = raw.trim().toLowerCase().replace(/^@/, "");
		if (!entry) continue;
		(entry.includes("@") ? addresses : domains).push(entry);
	}

	return { domains, addresses };
}

export function isPasswordSignUpAllowed(
	email: string | null | undefined,
): boolean {
	const value = email?.trim().toLowerCase();
	if (!value) return false;

	const parts = value.split("@");
	if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
	const host = parts[1];

	const { domains, addresses } = passwordSignUpList();

	if (addresses.includes(value)) return true;

	return domains.some(
		(domain) => host === domain || host.endsWith(`.${domain}`),
	);
}
