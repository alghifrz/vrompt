import { dark } from "@clerk/themes";

export const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorBackground: "#141414",
    colorForeground: "#f3f3ee",
    colorInput: "#1c1c1c",
    colorInputForeground: "#f3f3ee",
    colorPrimary: "#d4f26a",
    colorPrimaryForeground: "#14160c",
    colorNeutral: "#f3f3ee",
    colorDanger: "#f87171",
    borderRadius: "0.9rem",
    fontFamily: "var(--font-space-grotesk), Arial, Helvetica, sans-serif",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full bg-transparent shadow-none",
    card: "w-full border-0 bg-transparent shadow-none",
    headerTitle: "hidden",
    headerSubtitle: "text-[#8a8a84]",
    socialButtonsBlockButton:
      "border border-white/12 bg-[#1c1c1c] text-[#f3f3ee] shadow-none hover:bg-[#242424]",
    socialButtonsBlockButtonText: "text-[#f3f3ee]",
    dividerLine: "bg-white/10",
    dividerText: "text-white/40",
    formFieldLabel: "text-[#c4c4be]",
    formFieldInput:
      "border border-white/12 bg-[#1c1c1c] text-[#f3f3ee] placeholder:text-white/35 shadow-none",
    formButtonPrimary:
      "bg-[#d4f26a] text-[#14160c] shadow-none hover:bg-[#e2f88a]",
    footer: "bg-transparent",
    footerActionText: "text-[#8a8a84]",
    footerActionLink: "text-[#d4f26a] hover:text-[#e2f88a]",
    identityPreview: "border-white/12 bg-[#1c1c1c]",
    formFieldInputShowPasswordButton: "text-white/50",
    alternativeMethodsBlockButton:
      "border border-white/12 bg-[#1c1c1c] text-[#f3f3ee]",
  },
};
