import { AuthControls } from "../components/auth-controls";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Vrompt</h1>
      <p className="mt-4 text-lg leading-7 text-zinc-600 dark:text-zinc-400">
        Turn a project idea into a structured specification and AI coding-agent
        configuration.
      </p>
      <div className="mt-8">
        <AuthControls />
      </div>
      <p className="mt-8 text-sm text-zinc-500">
        Interview → Review → Generate
      </p>
      <ul className="mt-6 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <li>AGENTS.md</li>
        <li>Cursor</li>
        <li>Qoder</li>
        <li>Claude Code</li>
      </ul>
    </main>
  );
}
