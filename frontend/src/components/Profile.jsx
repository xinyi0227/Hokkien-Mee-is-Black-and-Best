import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Header from "./header";

const Profile = () => {
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
          department_name: data.department?.department_name || "Unknown"
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchUser();
  }, []);

  if (!user) return <div className="p-6">Loading profile...</div>;

  return (
    <>
      <Header />
      <div className="max-w-md mx-auto p-6 bg-white shadow rounded mt-6">
        <h2 className="text-2xl font-bold mb-4">Profile</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Department:</strong> {user.department_name}</p>
      </div>
    </>
  );
};

export default Profile;
