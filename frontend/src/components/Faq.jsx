import { useEffect, useState } from "react";
import Header from "./header";
import { supabase } from "../lib/supabase";

export default function FAQ() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faq_q_with_best")
      .select("*")
      .order("question_updated_at", { ascending: false });
    if (error) console.error(error);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto p-6 text-gray-900 dark:text-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">FAQ</h1>
            <button onClick={load} className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              Refresh
            </button>
          </div>

          {loading ? <div>Loading...</div> : rows.length === 0 ? (
            <div className="text-sm text-gray-500">No data</div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <section key={r.question_id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="font-semibold">{r.question}</div>
                  {r.answer ? (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                      {r.answer}
                      {typeof r.best_score === "number" && (
                        <span className="ml-2 text-xs text-gray-500">({r.best_score.toFixed(3)})</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-2">No matched answer</div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
