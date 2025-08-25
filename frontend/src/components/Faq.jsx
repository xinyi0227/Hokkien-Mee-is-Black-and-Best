import { useEffect, useState } from "react";
import Header from "./header";
import { supabase } from "../lib/supabase";

  const COLOR = {
    primary: "bg-[#1985a1] text-white hover:bg-[#89c2d9] hover:text-white",
    primaryOutline:
      "border border-[#1985a1] text-[#1985a1] hover:bg-[#89c2d9] hover:text-white dark:text-[#89c2d9] dark:border-[#89c2d9] dark:hover:bg-[#1985a1] dark:hover:text-white",
    save: "bg-[#aad576] text-white hover:bg-[#c1fba4] hover:text-white",
    cancel:
      "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800",
    icon:
      "px-2 py-1 rounded border border-transparent text-[#1985a1] hover:bg-[#e6f4f9] dark:hover:bg-gray-800",
  };

export default function FAQ() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [qText, setQText] = useState("");
  const [aText, setAText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("faq_q_with_best")
      .select("*")
      .not("answer", "is", null)
      .not("best_score", "is", null)
      .order("question_updated_at", { ascending: false });
    if (error) console.error(error);
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    try {
      setSyncing(true);
      await supabase.functions.invoke("faq-sync", { body: {} });
    } catch (e) {
      console.error("sync failed:", e);
      alert("Sync failed. Check logs and try again.");
    } finally {
      setSyncing(false);
      await load();
    }
  };

  const openAdd = () => {
    setQText("");
    setAText("");
    setShowAdd(true);
  };
  const closeAdd = () => {
    setShowAdd(false);
    setQText("");
    setAText("");
  };

  const handleCreateQA = async () => {
    if (!qText.trim() || !aText.trim()) {
      alert("Please fill in both Question and Answer.");
      return;
    }
    setSaving(true);
    try {
      const { error: errA } = await supabase
        .from("faq_answer")
        .insert([{ answer: aText.trim() }]);
      if (errA) throw errA;

      const { error: errQ } = await supabase
        .from("faq_question")
        .insert([{ question: qText.trim() }]);
      if (errQ) throw errQ;

      closeAdd();
      await load();
    } catch (e) {
      console.error("Create Q&A failed:", e);
      alert("Create failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto p-6 text-gray-900 dark:text-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">FAQ</h1>
            <div className="flex items-center gap-3">
              {syncing && (
                <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Refreshing...
                </span>
              )}
              <button
                onClick={openAdd}
                className={`px-3 py-2 rounded-lg ${COLOR.primary}`}
              >
                Add
              </button>
              <button
                onClick={handleRefresh}
                className={`px-3 py-2 rounded-lg ${COLOR.primaryOutline}`}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-gray-500">No data</div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <section
                  key={r.question_id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="font-semibold">{r.question}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">
                    {r.answer}
                    {typeof r.best_score === "number" && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({r.best_score.toFixed(3)})
                      </span>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 w-full max-w-lg rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Question &amp; Answer
              </h2>
              <button
                onClick={closeAdd}
                className={COLOR.icon}
                aria-label="Close"
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                  Question
                </label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  rows={3}
                  placeholder="Type your question…"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300">
                  Answer
                </label>
                <textarea
                  value={aText}
                  onChange={(e) => setAText(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  rows={6}
                  placeholder="Type the answer…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeAdd}
                  className={`px-3 py-2 rounded-lg ${COLOR.cancel}`}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQA}
                  disabled={saving || !qText.trim() || !aText.trim()}
                  className={`px-3 py-2 rounded-lg ${COLOR.save} disabled:opacity-50`}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
