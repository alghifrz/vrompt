import { SignInScreen } from "../../../components/auth/sign-in-screen";

export default function SignInLoading() {
  return (
    <SignInScreen
      clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
