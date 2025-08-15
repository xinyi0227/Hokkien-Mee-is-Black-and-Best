import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Header from "./header"; // 加在文件开头

const Details = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      // 假设你登录时有用 localStorage 保存 user email
      const email = localStorage.getItem("user_email");
      if (!email) return;

      const { data, error } = await supabase
        .from("user")  // 你的表名
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