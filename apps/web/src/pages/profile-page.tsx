import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Target } from "lucide-react";
import { Link } from "react-router";
import { localDate } from "@calwise/food-rules/log";
import { goalTargets, MACROS } from "@calwise/food-rules/goals";
import { authClient } from "../lib/auth-client";
import { useTRPC } from "../lib/trpc";
import { nutritionFormat } from "../lib/number-format";
import { LogQueryState } from "../modules/food-log/log-query-state";

export default function ProfilePage() {
  const { data: session } = authClient.useSession();
  const trpc = useTRPC();
  const query = useQuery(trpc.profile.goals.queryOptions({ date: localDate() }));
  const user = session?.user;
  const initials = user?.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-30 font-extrabold italic">PROFILE</h1>
        <div className="mt-4 flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-18 font-semibold text-lime"
          >
            {user?.image ? (
              <img src={user.image} alt="" className="size-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="break-words text-18 font-semibold">{user?.name}</p>
            <p className="mt-1 break-words text-12 text-muted">{user?.email}</p>
          </div>
        </div>
      </header>
      <section aria-labelledby="nutrition-heading">
        <h2 id="nutrition-heading" className="mb-3 text-11 font-semibold tracking-[1px]">
          NUTRITION
        </h2>
        {query.isPending || query.isError ? (
          <LogQueryState failed={query.isError} retry={() => void query.refetch()} />
        ) : (
          (() => {
            const targets = goalTargets(query.data);
            return (
              <Link
                to="/profile/nutrition-goals"
                className="block rounded-12 border border-line bg-surface p-4"
              >
                <div className="flex items-center gap-2 text-14">
                  <Target size={20} className="text-lime" />
                  Nutrition goals
                  <ChevronRight size={18} className="ml-auto text-muted" />
                </div>
                <p className="my-4">
                  <span className="font-display text-35 font-bold italic">
                    {nutritionFormat.format(targets.kcal)}
                  </span>
                  <span className="ml-3 text-10 text-muted">kcal / day</span>
                </p>
                <dl className="grid grid-cols-3 border-t border-line pt-4">
                  {MACROS.map((key) => (
                    <div key={key}>
                      <dt className="text-10 capitalize text-muted">{key}</dt>
                      <dd className="mt-1 text-18 font-semibold text-lime">
                        {nutritionFormat.format(query.data[key])}
                        {query.data.mode === "percentages" ? "%" : " g"}
                      </dd>
                      <dd className="mt-1 text-10 text-muted">{targets[key]} g / day</dd>
                    </div>
                  ))}
                </dl>
              </Link>
            );
          })()
        )}
      </section>
    </div>
  );
}
