import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Mail, Phone, MapPin, Users, Calendar, CheckCircle, FileText, Shield, Zap } from "lucide-react";
import logo from "../assets/handshake.png"; // adjust path if needed

export default function LandingPage() {
  // 👇 Feature slider content
  const features = [
    {
      title: "Smart Meeting Management",
      desc: "Easily organize, summarize, and track your meetings with AI assistance.",
      icon: <Calendar className="h-10 w-10" style={{ color: "#1985a1" }} />,
    },
    {
      title: "Digital Attachments",
      desc: "Upload, share, and store all meeting documents securely in one place.",
      icon: <FileText className="h-10 w-10" style={{ color: "#1985a1" }} />,
    },
    {
      title: "Task Tracking",
      desc: "Assign, update, and complete tasks with full transparency and accountability.",
      icon: <CheckCircle className="h-10 w-10" style={{ color: "#1985a1" }} />,
    },
  ];

  const [current, setCurrent] = useState(0);

  const prevSlide = () => {
    setCurrent((prev) => (prev === 0 ? features.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === features.length - 1 ? 0 : prev + 1));
  };

  // Benefits data
  const benefits = [
    {
      title: "Save Time",
      description: "Reduce meeting preparation and follow-up time by up to 70%"
    },
    {
      title: "Increase Productivity",
      description: "Keep your team aligned and focused on what matters most"
    },
    {
      title: "Improve Accountability",
      description: "Clear task assignments and tracking ensure nothing falls through the cracks"
    }
  ];

  // Testimonials data
  const testimonials = [
    {
      quote: "EaSys transformed how our team manages meetings. We've cut meeting time in half while doubling our effectiveness.",
      author: "Sarah Lim, Project Manager",
      company: "TechSolutions Inc."
    },
    {
      quote: "The task tracking feature alone has improved our team's productivity by 40%. No more forgotten action items!",
      author: "James Wong, Team Lead",
      company: "Innovate Malaysia"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-4 bg-white shadow-md">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full" />
          <h1 className="text-xl font-bold" style={{ color: "#1985a1" }}>EaSys</h1>
        </div>
        <nav className="space-x-6 font-medium text-gray-700">
          <a href="#features" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Features</a>
          <a href="#benefits" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Benefits</a>
          <a href="#testimonials" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Testimonials</a>
          <a href="#contact" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Contact</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-16">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: "#1985a1" }}>
              Streamline Your Meetings with AI-Powered Efficiency
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              EaSys helps teams organize, track, and follow up on meetings seamlessly, saving time and boosting productivity.
            </p>
            <button className="px-8 py-3 rounded-full text-white font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: "#1985a1" }}>
              Contact Us
            </button>
          </motion.div>

          {/* Stats Section - Optional addition */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto"
          >
            {/* <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold mb-1" style={{ color: "#1985a1" }}>70%</p>
              <p className="text-sm text-gray-600">Time Saved</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold mb-1" style={{ color: "#1985a1" }}>40%</p>
              <p className="text-sm text-gray-600">Productivity</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold mb-1" style={{ color: "#1985a1" }}>500+</p>
              <p className="text-sm text-gray-600">Teams</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold mb-1" style={{ color: "#1985a1" }}>98%</p>
              <p className="text-sm text-gray-600">Satisfaction</p>
            </div> */}
          </motion.div>
        </div>
      </section>

      {/* Features Slider */}
      <section id="features" className="py-16 px-6 bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#1985a1" }}>Powerful Features</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Designed to make your meeting management effortless and effective</p>
        </div>

        <div className="relative w-full max-w-3xl mx-auto px-8 py-12 text-center bg-blue-50 rounded-2xl">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="p-8 bg-white shadow-lg rounded-2xl"
          >
            <div className="mb-6 flex justify-center">
              {features[current].icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{features[current].title}</h2>
            <p className="text-gray-600">{features[current].desc}</p>
          </motion.div>

          {/* Arrows */}
          <button
            onClick={prevSlide}
            className="absolute top-1/2 left-4 -translate-y-1/2 p-2 bg-white rounded-full shadow hover:bg-blue-100"
            style={{ color: "#1985a1" }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute top-1/2 right-4 -translate-y-1/2 p-2 bg-white rounded-full shadow hover:bg-blue-100"
            style={{ color: "#1985a1" }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dots indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {features.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`h-3 w-3 rounded-full ${current === index ? 'bg-blue-600' : 'bg-gray-300'}`}
                style={{ backgroundColor: current === index ? "#1985a1" : "" }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Additional features grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 bg-blue-50 rounded-xl text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-10 w-10" style={{ color: "#1985a1" }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Storage</h3>
            <p className="text-gray-600">All your meeting data is encrypted and securely stored with enterprise-grade protection.</p>
          </div>

          <div className="p-6 bg-blue-50 rounded-xl text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-10 w-10" style={{ color: "#1985a1" }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-600">Invite team members, assign roles, and collaborate in real-time on meeting agendas and notes.</p>
          </div>

          <div className="p-6 bg-blue-50 rounded-xl text-center">
            <div className="flex justify-center mb-4">
              <Zap className="h-10 w-10" style={{ color: "#1985a1" }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Integration</h3>
            <p className="text-gray-600">Leverage AI to generate summaries, highlight action items, and suggest next steps automatically.</p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 px-6 bg-gradient-to-r from-blue-50 to-blue-100">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#1985a1" }}>Why Choose EaSys?</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">Transform how your team works together and achieves results</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-md text-center"
            >
              <h3 className="text-xl font-semibold mb-3" style={{ color: "#1985a1" }}>{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button className="px-6 py-3 rounded-full text-white font-medium shadow hover:shadow-lg transition-all duration-300"
            style={{ backgroundColor: "#1985a1" }}>
            See All Benefits
          </button>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-6 bg-white">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ color: "#1985a1" }}>What Our Customers Say</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Hear from teams that have transformed their meeting culture with EaSys</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-blue-50 p-6 rounded-xl shadow-md"
            >
              <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold" style={{ color: "#1985a1" }}>{testimonial.author}</p>
                <p className="text-gray-600 text-sm">{testimonial.company}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Description Section */}
      <section className="py-16 px-6 bg-gradient-to-r from-blue-50 to-blue-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl font-bold mb-6" style={{ color: "#1985a1" }}>Transform Your Meeting Experience</h2>

          <div className="space-y-8 text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <p className="text-gray-700">
                With EaSys, you can easily <span className="font-semibold" style={{ color: "#1985a1" }}>add meetings</span> to your calendar,
                ensuring all your important discussions are organized in one central location.
                Each meeting becomes a dedicated workspace for collaboration and follow-up.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <p className="text-gray-700">
                For each meeting, you can <span className="font-semibold" style={{ color: "#1985a1" }}>upload audio recordings</span>
                that our system will automatically process. This allows you to capture every detail of your discussion
                without worrying about taking extensive notes during the meeting.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <p className="text-gray-700">
                Our advanced AI technology will <span className="font-semibold" style={{ color: "#1985a1" }}>transcribe the audio</span>
                into accurate, searchable text, making it easy to review specific parts of the conversation
                or find important information discussed during the meeting.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-xl shadow-sm"
            >
              <p className="text-gray-700">
                Finally, our AI analyzes the conversation to <span className="font-semibold" style={{ color: "#1985a1" }}>generate comprehensive summaries </span>
                and <span className="font-semibold" style={{ color: "#1985a1" }}>automatically detect action items and tasks</span>.
                This ensures that decisions made during meetings are documented and assigned, with clear accountability
                and follow-through on all action items.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            viewport={{ once: true }}
            className="mt-12 pt-8 border-t border-blue-200"
          >
            <p className="text-xl text-gray-700">
              EaSys transforms meetings from time-consuming obligations into productive, actionable sessions
              that drive your business forward.
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-white py-16 px-6">
        <h3 className="text-2xl font-bold mb-12 text-center" style={{ color: "#1985a1" }}>Contact Us</h3>

        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
          {/* Contact Information - Left Side */}
          <div className="md:w-2/5 bg-blue-50 p-8 rounded-xl">
            <h4 className="text-xl font-semibold mb-6" style={{ color: "#1985a1" }}>Get in Touch</h4>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Mail className="h-5 w-5" style={{ color: "#1985a1" }} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Email</p>
                  <p className="text-gray-700">support@EaSys.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <Phone className="h-5 w-5" style={{ color: "#1985a1" }} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Phone</p>
                  <p className="text-gray-700">+60 123-456-789</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="mt-1">
                  <MapPin className="h-5 w-5" style={{ color: "#1985a1" }} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">Address</p>
                  <p className="text-gray-700">Bukit Beruang, Melaka, Malaysia</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="pt-4 mt-4 border-t border-blue-100">
                <p className="text-sm text-gray-600">
                  We typically respond to all inquiries within 24 hours during business days.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form - Right Side */}
          <div className="md:w-3/5 bg-white p-8 rounded-xl shadow-md">
            <h4 className="text-xl font-semibold mb-6" style={{ color: "#1985a1" }}>Send us a message</h4>
            <form className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  id="name"
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                <input
                  type="email"
                  id="email"
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  id="subject"
                  placeholder="How can we help?"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
                <textarea
                  id="message"
                  placeholder="Tell us about your needs..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-lg text-white font-medium w-full hover:bg-blue-700 transition-colors duration-300"
                style={{ backgroundColor: "#1985a1" }}
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 text-center py-6 text-sm text-gray-600">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <img src={logo} alt="Logo" className="h-8 w-8 rounded-full" />
              <h1 className="text-lg font-bold" style={{ color: "#1985a1" }}>EaSys</h1>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Privacy Policy</a>
              <a href="#" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Terms of Service</a>
              <a href="#" className="hover:text-blue-600" style={{ color: "#1985a1" }}>Careers</a>
            </div>
          </div>
          <p>© {new Date().getFullYear()} EaSys. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}