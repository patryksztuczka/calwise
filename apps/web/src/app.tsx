import { useEffect, useState } from "react";
import { CreateTodoForm } from "./modules/todo/create-todo-form";
import { TodoList } from "./modules/todo/todo-list";

export default function App() {
  const [apiStatus, setApiStatus] = useState<string>("checking…");

  useEffect(() => {
    fetch("/api/hello")
      .then((res) => res.json() as Promise<{ message: string }>)
      .then((data) => setApiStatus(data.message))
      .catch(() => setApiStatus("api offline"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-zinc-50">
      <h1 className="text-5xl font-bold tracking-tight">
        Hello, <span className="text-emerald-400">Calwise</span>
      </h1>
      <p className="text-lg text-zinc-400">React · Tailwind · Vite+ · pnpm workspaces</p>
      <div className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-sm text-zinc-300">
        api: {apiStatus}
      </div>

      <section className="flex w-80 flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="text-sm font-semibold text-zinc-400">todos via tRPC + TanStack Query</h2>
        <CreateTodoForm />
        <TodoList />
      </section>
    </main>
  );
}
