import { useEffect, useState } from "react";
import Header from "./header";
import { supabase } from "../lib/supabase";

export default function FAQ() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("faq-build", { body: { top_k: 3 } });
      if (error) throw error;
      setData(data);
    } catch (e) {
      console.error(e);
      alert("加载失败");
    } finally {
      setLoading(false);
    }
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

          {loading ? <div>Loading...</div> : !data || data.items?.length===0 ? (
            <div className="text-sm text-gray-500">No data</div>
          ) : (
            <div className="space-y-4">
              {data.items.map((it) => (
                <section key={it.question_id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="font-semibold">{it.question}</div>
                  {it.best ? (
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                      {it.best.answer}
                      <span className="ml-2 text-xs text-gray-500">({it.best.score.toFixed(3)})</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 mt-2">No confident answer</div>
                  )}
                  {it.alternatives?.length > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      Alternatives: {it.alternatives.map(a => a.score.toFixed(2)).join(", ")}
                    </div>
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
