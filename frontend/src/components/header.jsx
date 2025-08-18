import { CiMenuBurger } from "react-icons/ci";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmed = window.confirm("Do you sure you want to logout?");
    if (confirmed) {
      localStorage.removeItem("user_email");
      navigate("/"); 
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <a href="#" className="ml-2 text-xl font-bold text-gray-800">MyApp</a>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-8">
          <a href="/tasks" className="text-gray-600 hover:text-blue-600 transition">
            Home
          </a>
          <a href="/files" className="text-gray-600 hover:text-blue-600 transition">
            Report Analyser
          </a>
          <div className="relative inline-block text-left group">
          {/* Main link */}
          <a
            href="/setup"
            className="flex items-center text-gray-600 hover:text-blue-600 transition"
          >
            Meeting
            <span className="ml-1"></span>
          </a>

          {/* Dropdown (no gap, always stays open while hovering parent or dropdown) */}
          <div className="absolute hidden group-hover:block top-full w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-10 left-1/2 -translate-x-1/2">
            <a
              href="/meetingsToday"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Today
            </a>
            <a
              href="/meetingsFuture"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Future
            </a>
            <a
              href="/meetingsPast"
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Past
            </a>
          </div>
        </div>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition">
            Feedback Analyzer
          </a>
           {/* <a href="/meeting" className="text-gray-600 hover:text-blue-600 transition">
            Meeting
          </a> */}
           {/* <a href="/MeetingGenerator2" className="text-gray-600 hover:text-blue-600 transition">
            Meeting2
          </a> */}
          <a href="#" className="text-gray-600 hover:text-blue-600 transition">
            Contact
          </a>
          <div className="relative group">
            <CiMenuBurger size={24} className="text-gray-600 hover:text-blue-600 cursor-pointer" />
            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200">
              <a href="/details" className="block px-4 py-2 hover:bg-gray-100">Details</a>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu button */}
        <button className="md:hidden text-gray-600 hover:text-blue-600 focus:outline-none">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;