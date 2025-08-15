import { CiMenuBurger } from "react-icons/ci";
const Header = () => {
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
          <span className="ml-2 text-xl font-bold text-gray-800">MyApp</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex space-x-8">
          <a href="/tasks" className="text-gray-600 hover:text-blue-600 transition">
            Home
          </a>
          <a href="/files" className="text-gray-600 hover:text-blue-600 transition">
            Report Generator
          </a>
          <a href="/meeting" className="text-gray-600 hover:text-blue-600 transition">
            Meeting
          </a>
          <a href="#" className="text-gray-600 hover:text-blue-600 transition">
            About
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
              <a href="/details" className="block px-4 py-2 hover:bg-gray-100">Profile</a>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100">Logout</button>
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