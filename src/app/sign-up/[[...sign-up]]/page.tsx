import type { Metadata } from "next";
import { SignInScreen } from "../../../components/auth/sign-in-screen";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function SignUpPage() {
  return (
    <SignInScreen
      mode="sign-up"
      clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
