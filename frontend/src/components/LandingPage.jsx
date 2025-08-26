import { useState } from "react";
import { color, motion } from "framer-motion";
import { ChevronLeft, ChevronRight ,Mail, Phone, MapPin} from "lucide-react";
import logo from "../assets/handshake.png"; // adjust path if needed


export default function LandingPage() {
  // 👇 Feature slider content
  const features = [
    {
      title: "Smart Meeting Management",
      desc: "Easily organize, summarize, and track your meetings with AI assistance.",
    },
    {
      title: "Digital Attachments",
      desc: "Upload, share, and store all meeting documents securely in one place.",
    },
    {
      title: "Task Tracking",
      desc: "Assign, update, and complete tasks with full transparency and accountability.",
    },
  ];

  const [current, setCurrent] = useState(0);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? features.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === features.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 bg-white shadow-md">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full" />
          <h1 className="text-xl font-bold text-blue-600"   style={{ color: "#1985a1" }}>EaSys</h1>
        </div>
        <nav className="space-x-6 font-medium text-gray-700">
          {/* <a href="#features" className="hover:text-blue-600">Features</a> */}
          <a href="#contact" className="hover:text-blue-600">Contact</a>
        </nav>
      </header>

      {/* Hero / Slider */}
      <section id="features" className="flex-grow flex flex-col items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100" >
        <div className="relative w-full max-w-3xl px-8 py-12 text-center" >
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 bg-white shadow-lg rounded-2xl"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{features[current].title}</h2>
            <p className="text-gray-600">{features[current].desc}</p>
          </motion.div>

          {/* Arrows */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-white rounded-full shadow hover:bg-blue-100"
          >
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-white rounded-full shadow hover:bg-blue-100"
          >
            <ChevronRight className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </section>

      {/* Contact Section */}
     <section id="contact" className="bg-white py-12 px-6 text-center shadow-inner">
  <h3 className="text-2xl font-bold text-blue-600 mb-6"  style={{ color: "#1985a1" }}>Contact Us</h3>
  
  <div className="flex flex-col items-center space-y-3">
    <div className="flex items-center space-x-2">
      <Mail className="h-5 w-5 text-blue-600"  style={{ color: "#1985a1" }}/>
      <p className="text-gray-700">support@EaSys.com</p>
    </div>
    
    <div className="flex items-center space-x-2">
      <Phone className="h-5 w-5 text-blue-600" style={{ color: "#1985a1" }} />
      <p className="text-gray-700">+60 123-456-789</p>
    </div>
    
    <div className="flex items-center space-x-2">
      <MapPin className="h-5 w-5 text-blue-600"  style={{ color: "#1985a1" }}/>
      <p className="text-gray-700">Bukit Beruang, Melaka, Malaysia</p>
    </div>
  </div>
</section>


      {/* Footer */}
      <footer className="bg-gray-100 text-center py-4 text-sm text-gray-600">
        © {new Date().getFullYear()} EaSys. All rights reserved.
      </footer>
    </div>
  );
}
