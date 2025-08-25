import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Header from "./header";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem("user_email");
      if (!email) return;

      try {
        const { data, error } = await supabase
          .from("employee")
          .select(`
            email,
            role,
            department:employee_department_id_fkey ( department_name )
          `)
          .eq("email", email)
          .single();

        if (error) {
          console.error(error);
          return;
        }

        setUser({
          email: data.email,
          role: data.role,
          department_name: data.department?.department_name || "Unknown",
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, []);

  if (!user)
    return (
      <div className="p-6 text-gray-700 dark:text-gray-200">Loading profile...</div>
    );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-6">
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow text-gray-900 dark:text-gray-100">
          <h2 className="text-2xl font-bold mb-4">Profile</h2>

          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="font-medium break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Role</dt>
              <dd className="font-medium capitalize">{user.role}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Department</dt>
              <dd className="font-medium">{user.department_name}</dd>
            </div>
          </dl>
        </div>
      </main>
    </>
  );
}
