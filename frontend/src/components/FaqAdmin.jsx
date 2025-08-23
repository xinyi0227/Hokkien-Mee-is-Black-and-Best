import { useEffect, useState } from "react";
import Header from "./header";
import { supabase } from "../lib/supabase";

export default function FAQAdmin() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [savingQ, setSavingQ] = useState(false);
  const [savingA, setSavingA] = useState(false);
  const [syncing, setSyncing] = useState(false);
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

  const runSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("faq-sync", { body: {} });

      if (error) throw error;
      setRows(data?.items || rows);
    } catch (e) {
      console.error(e);
      alert("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    const question = q.trim();
    if (!question) return;
    setSavingQ(true);
    try {
      const { error } = await supabase.from("faq_question").insert([{ question }]);
      if (error) throw error;
      setQ("");
      await runSync();
    } catch (e) {
      console.error(e);
      alert("Insert question failed");
    } finally {
      setSavingQ(false);
    }
  };

  const addAnswer = async (e) => {
    e.preventDefault();
    const answer = a.trim();
    if (!answer) return;
    setSavingA(true);
    try {
      const { error } = await supabase.from("faq_answer").insert([{ answer }]);
      if (error) throw error;
      setA("");
      await runSync();
    } catch (e) {
      console.error(e);
      alert("Insert answer failed");
    } finally {
      setSavingA(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto p-6 text-gray-900 dark:text-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">FAQ Admin</h1>
            <div className="flex gap-2">
              <button
                onClick={runSync}
                disabled={syncing}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              >
                {syncing ? "Rebuilding..." : "Rebuild mapping"}
              </button>
              <button
                onClick={load}
                className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              >
                Refresh view
              </button>
            </div>
          </div>

          {/* Add Question */}
          <form onSubmit={addQuestion} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4">
            <div className="font-semibold mb-2">Add question</div>
            <input
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 mb-2"
              placeholder="Question"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" disabled={savingQ} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
              {savingQ ? "Saving..." : "Save question"}
            </button>
          </form>

          {/* Add Answer */}
          <form onSubmit={addAnswer} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-8">
            <div className="font-semibold mb-2">Add answer</div>
            <textarea
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 min-h-[120px] mb-2"
              placeholder="Answer"
              value={a}
              onChange={(e) => setA(e.target.value)}
            />
            <button type="submit" disabled={savingA} className="px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">
              {savingA ? "Saving..." : "Save answer"}
            </button>
          </form>

          {/* Preview from view */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-gray-500">Preview (from view: faq_q_with_best)</div>
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-500">No data</div>
          ) : (
            <div className="space-y-3">
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
