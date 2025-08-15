import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Header from "./header";

const Details = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const email = localStorage.getItem("user_email");
      if (!email) return;

      const { data, error } = await supabase
        .from("user")
        .select("email, role")
        .eq("email", email)
        .single();

      if (error) {
        console.error(error);
      } else {
        setUser(data);
      }
    };

    fetchUser();
  }, []);

  if (!user) return <div className="p-6">Loading user details...</div>;

  return (
        <>
        <Header />
    <div className="max-w-md mx-auto p-6 bg-white shadow rounded mt-6">
      <h2 className="text-2xl font-bold mb-4">User Details</h2>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role}</p>
    </div>
  </>
  );
};

export default Details;