import type { Metadata } from "next";
import { SignInScreen } from "../../../components/auth/sign-in-screen";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <SignInScreen
      clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
