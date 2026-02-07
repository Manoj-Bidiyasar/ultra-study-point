"use client";
import { useState } from "react";
import { db } from "@/lib/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function AboutPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [status, setStatus] = useState({
    loading: false,
    success: false,
    error: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: null });

    try {
      await addDoc(
        collection(
          db,
          "artifacts",
          "ultra-study-point",
          "public",
          "data",
          "contact_messages"
        ),
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "",
          subject: formData.subject || "", // OPTIONAL
          message: formData.message,

          /* ===== ADMIN FIELDS ===== */
          status: "new",
          replied: false,
          reply: null,

          timestamp: serverTimestamp(),
        }
      );

      setStatus({ loading: false, success: true, error: null });
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setStatus({
        loading: false,
        success: false,
        error: "Failed to send message.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] pb-12 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ================= TOP HEADER SECTION ================= */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-2xl mb-6 shadow-sm border border-blue-100">
            <span className="text-3xl text-blue-600">🎓</span>
          </div>
          <h1 className="text-4xl font-extrabold text-[#111827] mb-6">
            About Ultra Study Point
          </h1>
          <p className="text-gray-500 text-lg max-w-3xl mx-auto leading-relaxed">
            We are dedicated to providing quality education and helping students prepare for competitive exams
            through comprehensive study materials, current affairs, and practice questions.
          </p>
        </div>

        {/* ================= MISSION & COMMUNITY ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Our Mission */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-2xl">🎯</span>
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
                Our Mission
              </h3>
            </div>
            <p className="text-gray-500 leading-relaxed text-sm md:text-base">
              To provide concise, high-impact revision notes and daily updates that bridge the digital gap
              in education for rural and urban students alike.
            </p>
          </div>

          {/* Our Community */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-2xl">👥</span>
              <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
                Our Community
              </h3>
            </div>
            <p className="text-gray-500 leading-relaxed text-sm md:text-base">
              We serve thousands of aspirants across India preparing for state (SSC, Rajasthan GK)
              and national level competitive examinations.
            </p>
          </div>
        </div>

        {/* ================= WHAT WE OFFER ================= */}
        <div className="bg-[#1d4ed8] rounded-[2rem] p-8 md:p-10 mb-8 shadow-lg w-full">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-2xl">⭐</span>
            <h2 className="text-2xl font-bold text-white underline decoration-2 underline-offset-4">
              What We Offer
            </h2>
          </div>

          <div className="space-y-5">
            {[
              "Daily Current Affairs One-Liners",
              "Subject-wise Master Notes (History, Science, Math)",
              "Monthly PDF Compilations for Offline Study",
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 text-white font-bold text-base md:text-lg"
              >
                <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center shrink-0">
                  <span className="text-xs">✓</span>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* ================= CONTACT FORM ================= */}
        <div className="w-full bg-white p-8 md:p-12 rounded-[2rem] shadow-sm border border-gray-100">
          <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Contact Us
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm">
            Have questions? Send us a message and we'll get back to you shortly.
          </p>

          {status.success && (
            <div className="mb-8 p-4 bg-green-50 text-green-700 rounded-2xl text-center font-bold border border-green-100">
              ✓ Message sent successfully!
            </div>
          )}

          {status.error && (
            <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-center font-bold border border-red-100">
              {status.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                required
                placeholder="Your Name *"
                className="w-full p-4 bg-gray-50 border rounded-2xl"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />

              <input
                required
                type="email"
                placeholder="Email Address *"
                className="w-full p-4 bg-gray-50 border rounded-2xl"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input
                type="tel"
                placeholder="Mobile Number (optional)"
                className="w-full p-4 bg-gray-50 border rounded-2xl"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />

              <input
                type="text"
                placeholder="Subject (optional)"
                className="w-full p-4 bg-gray-50 border rounded-2xl"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
              />
            </div>

            <textarea
              required
              rows="4"
              placeholder="Your Message *"
              className="w-full p-4 bg-gray-50 border rounded-2xl"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            />

            <button
              type="submit"
              disabled={status.loading}
              className="w-full bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              {status.loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

