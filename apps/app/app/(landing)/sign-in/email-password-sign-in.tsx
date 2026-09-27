"use client";

import { signIn, signUp } from "@crm/auth/client";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Label } from "@crm/ui/components/label";
import { Spinner } from "@crm/ui/components/spinner";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

type Mode = "sign-in" | "sign-up";

export function EmailPasswordSignIn() {
	const [mode, setMode] = useState<Mode>("sign-in");
	const [pending, setPending] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const isSignUp = mode === "sign-up";

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);

		const origin = window.location.origin;
		const callbackURL = `${origin}/`;

		const { error } = isSignUp
			? await signUp.email({
					name: name.trim() || email.split("@")[0] || email,
					email: email.trim(),
					password,
					callbackURL,
				})
			: await signIn.email({
					email: email.trim(),
					password,
					callbackURL,
				});

		if (error) {
			setPending(false);
			toast.error(
				error.message ??
					(isSignUp
						? "Could not create the account."
						: "Wrong email or password."),
			);
			return;
		}

		window.location.assign(callbackURL);
	}

	return (
		<form className="flex flex-col gap-4" onSubmit={submit}>
			{isSignUp ? (
				<div className="flex flex-col gap-2">
					<Label htmlFor="auth-name">Full name</Label>
					<Input
						id="auth-name"
						autoComplete="name"
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</div>
			) : null}

			<div className="flex flex-col gap-2">
				<Label htmlFor="auth-email">Email</Label>
				<Input
					id="auth-email"
					type="email"
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					required
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="auth-password">Password</Label>
				<Input
					id="auth-password"
					type="password"
					autoComplete={isSignUp ? "new-password" : "current-password"}
					minLength={8}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					required
				/>
			</div>

			<Button className="w-full" disabled={pending} type="submit">
				{pending ? <Spinner data-icon="inline-start" /> : null}
				{isSignUp ? "Create account" : "Sign in"}
			</Button>

			<p className="text-center text-muted-foreground text-sm/5">
				{isSignUp ? "Already have an account?" : "New here?"}{" "}
				<button
					className="underline underline-offset-4 hover:text-foreground"
					onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
					type="button"
				>
					{isSignUp ? "Sign in" : "Create an account"}
				</button>
			</p>
		</form>
	);
}
