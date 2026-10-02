import type { InterviewViewMessage, InterviewViewQuestion } from "../../lib/interview/view-model";

export function MessageBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";

  return (
    <article
      className={`max-w-[42rem] rounded-lg px-4 py-3 text-sm leading-6 ${
        isUser
          ? "ml-auto bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
      }`}
    >
      <p className="mb-1 text-xs font-medium opacity-70">
        {isUser ? "You" : "Interviewer"}
      </p>
      <p className="whitespace-pre-wrap">{content}</p>
    </article>
  );
}

export function MessageList({
  messages,
  currentQuestion,
}: {
  messages: readonly InterviewViewMessage[];
  currentQuestion?: InterviewViewQuestion;
}) {
  const empty = messages.length === 0 && !currentQuestion;

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-6">
      {empty ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The interview will begin with a focused question about your project.
        </p>
      ) : null}
      {messages.map((message, index) => (
        <MessageBubble
          key={`${message.role}-${String(index)}`}
          role={message.role}
          content={message.content}
        />
      ))}
      {currentQuestion ? (
        <MessageBubble role="assistant" content={currentQuestion.text} />
      ) : null}
    </div>
  );
}
