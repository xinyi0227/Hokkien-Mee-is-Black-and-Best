import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import Header from "./header";
import { Navigate } from 'react-router-dom';
import FileUpload from './fileUpload';
import FileList from './fileList';

const FilePage = () =>{
    const [user, setUser] = useState(null);
    const [redirect, setRedirect] = useState(false);
    // file upload and listing
    const [currentUploader, setCurrentUploader] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const handleUploadSuccess = (uploaderName) => {
        setCurrentUploader(uploaderName);
        setRefreshKey(prev => prev + 1); // Trigger refresh of FileList
    };

    useEffect(() => {
        const fetchUser = async () => {
            const email = localStorage.getItem("user_email");
            if (!email) {
                setRedirect(true);
                return;
            }

            const { data, error } = await supabase
                .from("employee")
                .select("email, employee_id")
                .eq("email", email)
                .single();

            if (error) {
                console.error(error);
                setRedirect(true);
            } else if (data) {
                setUser(data);
            } else {
                setRedirect(true);
            }
        };

        fetchUser();
    }, []);

    if (redirect) {
        return <Navigate to="/Login" replace />;
    }

    if (!user) return null;

    return (
        <>
        <Header />
            <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                    {user.employee_id && (
                    <div className="mt-8">
                        <FileList key={refreshKey} uploader={user.employee_id} />
                    </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default FilePage;