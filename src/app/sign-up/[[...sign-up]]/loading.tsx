import { SignInScreen } from "../../../components/auth/sign-in-screen";

export default function SignUpLoading() {
  return (
    <SignInScreen
      mode="sign-up"
      clerkEnabled={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)}
    />
  );
}
